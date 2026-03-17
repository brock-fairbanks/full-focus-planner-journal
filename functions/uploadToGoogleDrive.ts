import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { file_url, text_content, file_name, mime_type } = body;

        if ((!file_url && !text_content) || !file_name || !mime_type) {
             return Response.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

        const FOLDER_NAME = 'Planner Recordings';
        const query = `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        
        // 1. Check if folder exists
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const searchData = await searchRes.json();
        
        let folderId = null;
        if (searchData.files && searchData.files.length > 0) {
            folderId = searchData.files[0].id;
        } else {
            // 2. Create the folder if it doesn't exist
            const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder'
                })
            });
            const folderData = await createFolderRes.json();
            folderId = folderData.id;
        }

        const { file_id } = body;

        let fileBlob;
        if (file_url) {
            const fileResponse = await fetch(file_url);
            fileBlob = await fileResponse.blob();
        } else {
            fileBlob = new Blob([text_content], { type: mime_type });
        }

        const form = new FormData();
        let driveRes;

        if (file_id) {
            // Update existing file
            const metadata = {
                name: file_name,
                mimeType: mime_type
            };
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', fileBlob);

            driveRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${file_id}?uploadType=multipart`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: form,
            });
        } else {
            // Create new file
            const metadata = {
                name: file_name,
                mimeType: mime_type,
                parents: [folderId],
            };
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', fileBlob);

            driveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: form,
            });
        }

        if (!driveRes.ok) {
            const errorText = await driveRes.text();
            throw new Error(`Drive API error: ${errorText}`);
        }

        const driveData = await driveRes.json();

        return Response.json({ success: true, fileId: driveData.id });
    } catch (error) {
        console.error("Error uploading to drive:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});