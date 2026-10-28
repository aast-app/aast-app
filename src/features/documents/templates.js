import templateImage1 from '../../assets/login-template-1.png';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function generateRosterPdfHtml(timeGroups) {
  let htmlPages = [];
  const timeKeys = Object.keys(timeGroups);
  
  for (let pIdx = 0; pIdx < timeKeys.length; pIdx++) {
    const time = timeKeys[pIdx];
    const students = timeGroups[time];
    let rowsHtml = '';
    
    // 18 rows comfortably fit on one page without any text wrapping issues. Scale down aggressively if more.
    const scale = Math.min(1, 18 / Math.max(1, students.length));
    const fontSize = (10 * scale).toFixed(2) + 'px';
    const headerFontSize = (12 * scale).toFixed(2) + 'px';
    const padY = (5 * scale).toFixed(2) + 'px';
    const padX = (4 * scale).toFixed(2) + 'px';
    const mb = (30 * scale).toFixed(2) + 'px'; // Increased margin to prevent clipping
    
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      rowsHtml += `
        <tr>
          <td>${escapeHtml(student['Reg num'])}</td>
          <td>${escapeHtml(student['Name'])}</td>
          <td>${escapeHtml(student['Mobile'])}</td>
          <td>${escapeHtml(student['Date'])}</td>
          <td>${escapeHtml(student['Time'])}</td>
          <td>${escapeHtml(student['Location'])}</td>
          <td>${escapeHtml(student['Username'])}</td>
          <td>${escapeHtml(student['Password'])}</td>
        </tr>
      `;
    }
    
    const pageHtml = `
      <div class="page page-${pIdx}">
        <style>
          .page-${pIdx} .header-layout { font-size: ${headerFontSize} !important; margin-bottom: ${mb} !important; }
          .page-${pIdx} .data-table { font-size: ${fontSize} !important; }
          .page-${pIdx} .data-table th, .page-${pIdx} .data-table td { padding: ${padY} ${padX} !important; }
        </style>
        <table class="header-layout">
          <tr>
            <td class="header-left">Arab Academy for Science, Technology<br/>and Maritime Transport</td>
            <td class="header-right">AASTMT-CEPT-IEC</td>
          </tr>
        </table>
        <table class="data-table">
          <thead>
            <tr>
              <th class="w-reg">Reg num</th>
              <th class="w-name">Name</th>
              <th class="w-mobile">Mobile</th>
              <th class="w-date">Date</th>
              <th class="w-time">Time</th>
              <th class="w-loc">Location</th>
              <th class="w-user">Username</th>
              <th class="w-pass">Password</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
    htmlPages.push(pageHtml);
  }

  
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0; padding: 0;">
      <style>
        .page { width: 296mm; margin: 0; padding: 10mm; box-sizing: border-box; page-break-after: always; }
        .header-layout { width: 100%; font-weight: bold; color: black; border: none; margin-bottom: 25px; line-height: 1.5; }
        .header-left { text-align: left; vertical-align: bottom; border: none !important; padding: 0 !important; background: transparent !important; }
        .header-right { text-align: right; vertical-align: bottom; border: none !important; padding: 0 !important; background: transparent !important; }
        .data-table { width: 100%; border-collapse: collapse; text-align: center; table-layout: fixed; }
        .data-table th { background-color: #5B9BD5; color: white; border: 1px solid #1f4e78; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .data-table td { border: 1px solid #1f4e78; color: black; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .data-table tbody tr:nth-child(odd) td { background-color: #EDF4FC; }
        .data-table tbody tr:nth-child(even) td { background-color: #DDEBF7; }
        .w-reg { width: 12%; }
        .w-name { width: 25%; }
        .w-mobile { width: 12%; }
        .w-date { width: 9%; }
        .w-time { width: 9%; }
        .w-loc { width: 12%; }
        .w-user { width: 12%; }
        .w-pass { width: 9%; }
      </style>
      ${htmlPages.join('')}
    </div>
  `;
}

export function generateLoginPdfHtml(students) {
  let htmlPages = [];
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const cambridgeBlue = '#3273B6';
    const cambridgeGold = '#9C8D4B';

    const pageHtml = `
      <div class="page" style="width: 794px; height: 1123px; padding: 95px 76px; box-sizing: border-box; page-break-after: always; position: relative; background: white; font-family: Arial, Helvetica, sans-serif;">
        <!-- Header Box -->
        <table style="width: 100%; border: 1px solid #c2c2c2; border-radius: 12px; margin-bottom: 45px; border-collapse: separate; border-spacing: 0; padding: 15px 25px; box-sizing: border-box; table-layout: fixed;">
          <tr>
            <td style="vertical-align: middle; width: 55%; padding-right: 12px;">
              <div style="color: ${cambridgeGold}; font-size: 26px; font-weight: bold; margin-bottom: 3px;">Cambridge English</div>
              <div style="color: ${cambridgeBlue}; font-size: 42px; font-weight: bold;">Placement Test</div>
            </td>
            <td style="vertical-align: middle; width: 45%;">
              <table style="width: 100%; border-collapse: separate; border-spacing: 0 4px;">
                <tr>
                  <td style="background-color: ${cambridgeBlue}; color: white; font-weight: bold; text-align: center; padding: 8px; width: 35%; font-size: 15px;">Time</td>
                  <td style="width: 4px;"></td>
                  <td style="background-color: ${cambridgeGold}; color: white; text-align: center; padding: 8px; width: 65%; font-size: 15px;">${escapeHtml(student.Time)}</td>
                </tr>
                <tr>
                  <td colspan="3" style="background-color: ${cambridgeBlue}; color: white; font-weight: bold; text-align: center; padding: 8px; font-size: 15px;">Location</td>
                </tr>
                <tr>
                  <td colspan="3" style="background-color: ${cambridgeGold}; color: white; font-weight: bold; text-align: center; padding: 8px; font-size: 15px;">${escapeHtml(student.Location)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Login Instructions -->
        <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 25px; color: black; margin-left: 20px;">Candidate Login Information</h2>
        <div style="text-align: center; font-size: 20px; margin-bottom: 35px; color: black; line-height: 1.4;">
          You will need the information below in order to start your test<br/>
          Enter this information on the test login screen
        </div>

        <!-- Credentials Box -->
        <div style="border: 1px solid ${cambridgeBlue}; padding: 25px; margin-bottom: 35px; width: 95%; box-sizing: border-box; margin-left: auto; margin-right: auto;">
          <table class="login-credentials" style="width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 15px;">
            <colgroup><col style="width: 125px;"/><col style="width: 165px;"/><col/></colgroup>
            <tr>
              <td style="font-weight: bold; padding: 12px 10px; white-space: nowrap; color: black;">Test URL</td>
              <td colspan="2" style="font-weight: bold; padding: 12px 10px 12px 0; overflow-wrap: anywhere; color: black;">https://www.metritests.com/metrica/EG230.asp</td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 12px 10px; white-space: nowrap; color: black;">Username</td>
              <td style="font-weight: bold; padding: 12px 12px 12px 0; overflow-wrap: anywhere; color: black;">${escapeHtml(student.Username)}</td>
              <td style="padding: 6px 0;">
                <div style="background-color: ${cambridgeBlue}; color: white; text-align: center; padding: 8px; width: 100%; box-sizing: border-box; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Full Name</div>
              </td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 12px 10px; white-space: nowrap; color: black;">Password</td>
              <td style="font-weight: bold; padding: 12px 12px 12px 0; overflow-wrap: anywhere; color: black;">${escapeHtml(student.Password)}</td>
              <td style="padding: 6px 0;">
                <div style="background-color: ${cambridgeBlue}; color: white; text-align: center; padding: 8px; width: 100%; box-sizing: border-box; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(student.Name ? student.Name.trim().split(/\s+/).slice(0, 3).join(' ') : '')}</div>
              </td>
            </tr>
            <tr>
              <td style="font-weight: bold; padding: 12px 10px; white-space: nowrap; color: black; line-height: 1.2;">Institution ID</td>
              <td style="font-weight: bold; padding: 12px 12px 12px 0; overflow-wrap: anywhere; color: black;">EG230</td>
              <td></td>
            </tr>
          </table>
        </div>

        <!-- Footer Info -->
        <div style="text-align: center;">
          <table style="margin: 0 auto; border-collapse: separate; border-spacing: 2px; font-size: 15px;">
            <tr>
              <td style="background-color: ${cambridgeBlue}; color: white; font-weight: bold; padding: 5px 12px; width: 80px; text-align: left;">Agent</td>
              <td style="background-color: ${cambridgeBlue}; color: white; padding: 5px 12px; width: 350px; text-align: left;">AASTMT (EG230)</td>
            </tr>
            <tr>
              <td style="background-color: ${cambridgeBlue}; color: white; font-weight: bold; padding: 5px 12px; text-align: left;">Venue</td>
              <td style="background-color: ${cambridgeBlue}; color: white; padding: 5px 12px; text-align: left;">AASTMT(Abu Qir)</td>
            </tr>
          </table>
          <div style="font-size: 14px; margin-top: 8px; color: black;">
            <b>Product</b> CEPT Reading and Listening
          </div>
        </div>

        <!-- Logo -->
        <div style="position: absolute; bottom: 95px; left: 76px;">
          <img src="${templateImage1}" style="width: 250px;" alt="Cambridge English" />
        </div>
      </div>
    `;
    htmlPages.push(pageHtml);
  }
  return `<div style="font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0; padding: 0;">${htmlPages.join('')}</div>`;
}

