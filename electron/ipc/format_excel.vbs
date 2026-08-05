Set objArgs = WScript.Arguments
If objArgs.Count = 0 Then
    WScript.Quit 1
End If

filePath = objArgs(0)

On Error Resume Next
Set objExcel = CreateObject("Excel.Application")
objExcel.Visible = False
objExcel.DisplayAlerts = False

Set objWorkbook = objExcel.Workbooks.Open(filePath)

If Err.Number <> 0 Then
    WScript.Quit 2
End If

For Each objWorksheet In objWorkbook.Worksheets
    ' Get the used range
    Set objRange = objWorksheet.UsedRange
    
    If objRange.Rows.Count > 1 Then
        ' Format Header Row
        Set objHeader = objWorksheet.Range(objWorksheet.Cells(1, 1), objWorksheet.Cells(1, objRange.Columns.Count))
        objHeader.Interior.Color = RGB(91, 155, 213) ' Blue header
        objHeader.Font.Color = RGB(255, 255, 255) ' White text
        objHeader.Font.Bold = True
        objHeader.HorizontalAlignment = -4108 ' xlCenter
        objHeader.VerticalAlignment = -4108 ' xlCenter
        
        ' Add AutoFilter
        objHeader.AutoFilter 1
        
        ' Alternating Row Colors (Zebra Striping)
        For i = 2 To objRange.Rows.Count
            Set objRow = objWorksheet.Range(objWorksheet.Cells(i, 1), objWorksheet.Cells(i, objRange.Columns.Count))
            objRow.HorizontalAlignment = -4108 ' xlCenter
            objRow.VerticalAlignment = -4108 ' xlCenter
            If i Mod 2 = 0 Then
                objRow.Interior.Color = RGB(221, 235, 247) ' Light blue
            Else
                objRow.Interior.Color = RGB(255, 255, 255) ' White
            End If
        Next
        
        ' Add Borders
        objRange.Borders.LineStyle = 1
        objRange.Borders.Weight = 2 ' xlThin
        objRange.Borders.Color = RGB(0, 0, 0)
        
        ' AutoFit Columns
        objRange.Columns.AutoFit
    End If
Next

objWorkbook.Save
objWorkbook.Close True
objExcel.Quit

Set objWorksheet = Nothing
Set objWorkbook = Nothing
Set objExcel = Nothing
