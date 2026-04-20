const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const qs = require('querystring');
require('dotenv').config({ path: 'c:/mposter/.env' });

async function refreshBloggerToken(site, clientId, clientSecret) {
    const res = await axios.post('https://oauth2.googleapis.com/token', qs.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: site.refreshToken
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    await prisma.site.update({ where: { id: site.id }, data: { apiToken: res.data.access_token } });
    return res.data.access_token;
}

async function run() {
    try {
        const site = await prisma.site.findFirst({ where: { type: 'BLOGSPOT' } });
        let token = site.apiToken;
        try {
            token = await refreshBloggerToken(site, process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        } catch(e) {}
        
        let blogId = site.username || site.url.split('blogId=')[1] || site.url.replace(/[^0-9]/g, '');
        console.log('Token ready. Trying to post to', blogId, 'with isDraft=true in query...');
        
        const res = await axios.post(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?isDraft=true`, {
            kind: 'blogger#post',
            title: '[Draft Test] API Script Test',
            content: 'This should be a draft.'
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Result HTTP status:', res.status, 'Response Body status:', res.data.status);
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}
run();
