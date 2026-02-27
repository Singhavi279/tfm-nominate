import { Storage } from '@google-cloud/storage';

async function listBuckets() {
    const storage = new Storage({
        projectId: 'studio-9085921874-cd434'
    });

    try {
        const [buckets] = await storage.getBuckets();
        console.log('Buckets:');
        buckets.forEach(bucket => {
            console.log(bucket.name);
        });
        if (buckets.length === 0) {
            console.log('No buckets found! Firebase Storage is not initialized.');
        }
    } catch (err) {
        console.error('Failed to list buckets:', err);
    }
}

listBuckets();
