import mongoose from "mongoose";

let supported;

export const supportsTransactions = async () => {
  if (supported !== undefined) return supported;

  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    supported = Boolean(hello.setName || hello.msg === "isdbgrid");
  } catch {
    supported = false;
  }

  return supported;
};


export const atomically = async (work) => {
  if (!(await supportsTransactions())) return work(undefined);

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

export const opts = (session) => (session ? { session } : {});
