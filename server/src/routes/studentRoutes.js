import express from 'express';
import { registrationBase, nextRegistrationNumber } from '../utils/nextRegistration.js';
import { prisma } from '../db/connect.js';

const router = express.Router();

// Read-only, base-first lookup through R10 for staff creating a handful of login slips.
router.post('/login-student-details', async (req, res, next) => {
  try {
    const numbers = req.body.registrationNumbers;
    if (!Array.isArray(numbers) || !numbers.length || numbers.length > 100 || numbers.some(number => typeof number !== 'string' || !number.trim() || number.length > 100)) return res.status(400).json({ success: false, message: 'Choose between 1 and 100 registration numbers.' });
    const requested = [...new Set(numbers.map(number => number.trim()))];
    const candidates = [...new Set(requested.flatMap(number => { const base = registrationBase(number); return [base, ...Array.from({ length: 10 }, (_, index) => `${base}-R${index + 1}`)]; }))];
    const found = new Map();
    for (let offset = 0; offset < candidates.length; offset += 100) {
      const students = await prisma.student.findMany({ where: { registrationNumber: { in: candidates.slice(offset, offset + 100) } }, select: { registrationNumber: true, name: true, firstName: true, lastName: true, nameVerified: true } });
      for (const student of students) found.set(student.registrationNumber, student);
    }
    const students = requested.flatMap(number => {
      const base = registrationBase(number);
      const match = [base, ...Array.from({ length: 10 }, (_, index) => `${base}-R${index + 1}`)].map(candidate => found.get(candidate)).find(Boolean);
      return match ? [{ registrationNumber: number, matchedRegistrationNumber: match.registrationNumber, name: match.name || `${match.firstName || ''} ${match.lastName || ''}`.trim(), nameVerified: match.nameVerified }] : [];
    });
    res.json({ success: true, students });
  } catch (error) { next(error); }
});

router.post('/admin-get-students', async (req, res) => {
  try {
    const { adminUsername, page = 1, pageSize = 50, searchQuery = '', searchDate = '' } = req.body;
    
    // Validate admin (basic check for now)
    const admin = await prisma.user.findUnique({
      where: { username: adminUsername }
    });

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const skip = (page - 1) * pageSize;
    let andConditions = [];

    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.trim().replace(/\s+/g, ' ');
      const parts = query.split(/\s+/);
      
      let textOr = [{ name: { contains: query } }];

      if (parts.length > 1) {
        // Multi-word search
        textOr.push({ registrationNumber: { contains: query } });
        textOr.push({
          AND: [
            { firstName: { contains: parts[0] } },
            { lastName: { contains: parts.slice(1).join(' ') } }
          ]
        });
        textOr.push({
          AND: [
            { firstName: { contains: parts.slice(0, parts.length - 1).join(' ') } },
            { lastName: { contains: parts[parts.length - 1] } }
          ]
        });
      } else {
        // Single word search
        textOr.push({ registrationNumber: { contains: query } });
        textOr.push({ firstName: { contains: query } });
        textOr.push({ lastName: { contains: query } });
      }
      
      andConditions.push({ OR: textOr });
    }

    if (searchDate && searchDate.trim() !== '') {
      const maybeDate = new Date(searchDate);
      if (!isNaN(maybeDate.getTime())) {
        const startOfDay = new Date(maybeDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(maybeDate);
        endOfDay.setHours(23, 59, 59, 999);

        andConditions.push({
          OR: [
            { createdAt: { gte: startOfDay, lte: endOfDay } },
            { updatedAt: { gte: startOfDay, lte: endOfDay } }
          ]
        });
      }
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const students = await prisma.student.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' }
    });

    const totalStudents = await prisma.student.count({ where });

    res.json({
      success: true,
      students,
      totalStudents,
      totalPages: Math.ceil(totalStudents / pageSize)
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Resolve against the entire database, not just the current search/page.
router.post('/admin-next-registration-numbers', async (req, res) => {
 try {
  const { adminUsername, baseNumbers } = req.body;
  if (typeof adminUsername !== 'string') return res.status(403).json({success:false,message:'Unauthorized.'});
  const admin = await prisma.user.findUnique({where:{username:adminUsername}});
  if (!admin || admin.role !== 'admin') return res.status(403).json({success:false,message:'Unauthorized.'});
  if (!Array.isArray(baseNumbers) || !baseNumbers.length || baseNumbers.length > 500 || baseNumbers.some(n=>typeof n!=='string'||!n.trim()||n.length>100)) return res.status(400).json({success:false,message:'Select between 1 and 500 students.'});
  const bases = [...new Set(baseNumbers.map(registrationBase))];
  if(bases.some(base=>!base))return res.status(400).json({success:false,message:'Invalid registration number.'});
  const registrations = [];
  for(let offset=0;offset<bases.length;offset+=100){
   const rows=await prisma.student.findMany({where:{OR:bases.slice(offset,offset+100).flatMap(base=>[{registrationNumber:base},{registrationNumber:{startsWith:`${base}-`}}])},select:{registrationNumber:true}});
   registrations.push(...rows.map(row=>row.registrationNumber));
  }
  const numbers=bases.map(base=>nextRegistrationNumber(base,registrations));
  if(numbers.some(number=>number===null))return res.status(409).json({success:false,message:'A selected student no longer exists. Refresh the database and select them again.'});
  res.json({success:true,numbers});
 } catch(error){
  console.error('Registration export error:',error);
  res.status(500).json({success:false,message:'Could not calculate next registration numbers. Please try again.'});
 }
});

export default router;
