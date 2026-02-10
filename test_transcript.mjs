const apiKey = 'sd_afd3eec32415c596fa058c98d9fcd26f';
const videoId = 'SuOR-A-2Q-M';

async function testSupadata() {
  try {
    console.log('--- Testing Ko ---');
    const resKo = await fetch(`https://api.supadata.ai/v1/youtube/transcript?url=https://www.youtube.com/watch?v=${videoId}&lang=ko`, {
      headers: { 'x-api-key': apiKey }
    });
    console.log('Status (ko):', resKo.status);
    const dataKo = await resKo.json();
    console.log('Data (ko) content snippet:', JSON.stringify(dataKo).substring(0, 500));

    console.log('\n--- Testing Metadata ---');
    const resMeta = await fetch(`https://api.supadata.ai/v1/youtube/transcript?url=https://www.youtube.com/watch?v=${videoId}&mode=metadata`, {
      headers: { 'x-api-key': apiKey }
    });
    const dataMeta = await resMeta.json();
    console.log('Available Languages:', JSON.stringify(dataMeta.available_languages || dataMeta.languages || dataMeta));
  } catch (err) {
    console.error(err);
  }
}

testSupadata();
