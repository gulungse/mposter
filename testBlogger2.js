const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const qs = require('querystring');

async function run() {
    try {
        const site = await prisma.site.findFirst({ where: { type: 'BLOGSPOT' } });
        if (!site) return console.log('No blogspot site found');
        
        const settings = await prisma.globalSetting.findUnique({ where: { id: 'SYSTEM' } });
        if (!settings || !settings.googleClientId) return console.log('No google settings');
        
        // Refresh token
        const authRes = await axios.post('https://oauth2.googleapis.com/token', qs.stringify({
            client_id: settings.googleClientId,
            client_secret: settings.googleClientSecret,
            grant_type: 'refresh_token',
            refresh_token: site.refreshToken
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        
        const token = authRes.data.access_token;
        let blogId = site.username || site.url.split('blogId=')[1] || site.url.replace(/[^0-9]/g, '');
        console.log('Token ready. Trying to post to', blogId, 'with isDraft=true in query...');
        
        // Try creating a draft post
        const res = await axios.post(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts`, {
            kind: 'blogger#post',
            title: '[Draft Test] System Test',
            content: 'This should be a draft.'
        }, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { isDraft: true }
        });
        
        console.log('Post created. Status:', res.data.status, 'URL:', res.data.url);
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}
run();
