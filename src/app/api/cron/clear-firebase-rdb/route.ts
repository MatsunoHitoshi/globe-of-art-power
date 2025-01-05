import { initializeFirebaseApp } from "@/app/_utils/firebase";
import { NextResponse } from "next/server";
import { getDatabase, remove, ref } from "@firebase/database";
import { FirebaseError } from "@firebase/util";

initializeFirebaseApp();

export const GET = async (_request: Request) => {
  try {
    const db = getDatabase();
    const dbRef = ref(db, "current-controls/");
    await remove(dbRef);
    return NextResponse.json({
      message: `removeAt: ${new Date().toISOString()}`,
    });
  } catch (e) {
    if (e instanceof FirebaseError) {
      throw e;
    }
    return;
  }
};
