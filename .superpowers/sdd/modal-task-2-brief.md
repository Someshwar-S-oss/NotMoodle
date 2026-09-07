# Task 2: Elevated Assignment Viewer & Interactive Drag-and-Drop Submission Zone

## Files
- Modify: src/components/AssignmentDetails.tsx
- Test: src/__tests__/DrawersAndSecondaryPages.test.tsx

## Requirements
1. **Assignment Header, Overview & Attachments (src/components/AssignmentDetails.tsx)**:
   - Replace harsh square buttons and brutalist borders.
   - Open in Moodle button: ounded-lg px-4 py-2 bg-foreground text-background hover:bg-foreground/90 font-medium text-xs shadow-xs inline-flex items-center gap-2 transition-all.
   - Overview cards (Due date, Grading): ounded-xl border border-border/30 bg-card/50 p-4 shadow-xs.
   - Instructions container: g-card p-6 border border-border/30 rounded-xl shadow-xs.
   - Attachment items: lex items-center gap-3 p-3.5 rounded-xl bg-background/50 hover:bg-muted/40 border border-border/30 hover:border-border transition-all shadow-xs.

2. **Interactive Drag-and-Drop Upload Zone & Selected File Preview**:
   - Add drag state: isDragging: boolean.
   - Implement onDragOver, onDragLeave, onDrop event handlers.
   - When no file is selected:
     - Render an interactive dropzone with dashed border:
       order-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center cursor-pointer 
     - Hidden file <input type="file" ref={fileInputRef} className="hidden" /> triggered on dropzone click or keyboard Enter/Space.
     - Upload illustration/icon: UploadCloud with subtle bounce or styling.
     - Friendly copy: *"Drag and drop your assignment file here, or click to browse"* and *"Supports PDF, DOCX, ZIP up to university file limit"*.
   - When file is selected:
     - Render a clean file preview card (p-4 rounded-xl border border-border/40 bg-card flex items-center justify-between shadow-xs).
     - File icon, file name, formatted size badge, and a remove file button (X icon with ria-label="Remove selected file").
   - Submit button:
     - w-full rounded-xl py-3 px-6 bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer.

3. **Update and expand tests in src/__tests__/DrawersAndSecondaryPages.test.tsx**:
   - Add test verifying drag and drop / file selection displays the file card.
   - Add test verifying remove file button clears the selected file.
   - Verify status badges and attachment links.

4. **Verify and commit**:
   - Run 
pm test and 
pm run build.
   - Commit with message: eat: overhaul assignment viewer and add interactive drag-and-drop submission zone.
