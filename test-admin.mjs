// Quick test script to check if the Admin SDK can query submissions
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
    initializeApp({
        projectId: "studio-9085921874-cd434",
    });
}

const db = getFirestore();

async function test() {
    console.log("=== Testing Firebase Admin SDK Firestore Access ===\n");

    // 1. Test basic connectivity — read form_configurations
    console.log("1. Reading form_configurations...");
    try {
        const configs = await db.collection("form_configurations").get();
        console.log(`   Found ${configs.size} form configurations`);
        configs.docs.forEach(d => console.log(`   - ${d.id}`));
    } catch (e) {
        console.error("   FAILED:", e.message);
    }

    // 2. Test reading users collection
    console.log("\n2. Reading users collection...");
    try {
        const users = await db.collection("users").get();
        console.log(`   Found ${users.size} users`);
        users.docs.forEach(d => console.log(`   - ${d.id}`));
    } catch (e) {
        console.error("   FAILED:", e.message);
    }

    // 3. For each user, check their submissions subcollection
    console.log("\n3. Checking submissions per user...");
    try {
        const users = await db.collection("users").get();
        for (const userDoc of users.docs) {
            const subs = await db.collection("users").doc(userDoc.id).collection("submissions").get();
            console.log(`   User ${userDoc.id}: ${subs.size} submissions`);
            subs.docs.forEach(d => {
                const data = d.data();
                console.log(`     - ID: ${d.id}, formConfigId: ${data.formConfigurationId}, submittedAt: ${data.submittedAt?.toDate?.()}`);
            });
        }
    } catch (e) {
        console.error("   FAILED:", e.message);
    }

    // 4. Test collectionGroup query
    console.log("\n4. Testing collectionGroup('submissions')...");
    try {
        const snapshot = await db.collectionGroup("submissions").get();
        console.log(`   Found ${snapshot.size} total submissions via collectionGroup`);
        snapshot.docs.forEach(d => {
            const data = d.data();
            console.log(`   - ID: ${d.id}, path: ${d.ref.path}, formConfigId: ${data.formConfigurationId}`);
        });
    } catch (e) {
        console.error("   FAILED:", e.message);
        console.error("   Full error:", e);
    }
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
