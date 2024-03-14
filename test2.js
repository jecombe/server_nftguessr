class Ipfs {
  constructor() {
    this.helia = null;
    //this.blockstore = new MemoryBlockstore();
  }

  async createBlock() {
    const { MemoryBlockstore } = await import("blockstore-core");
    const blockstore = new MemoryBlockstore();

    return createHelia({
      blockstore,
    });
  }

  async readData() {
    // create a second Helia node using the same blockstore
    const helia2 = await createHelia({
      blockstore,
    });

    // create a second filesystem
    const fs2 = unixfs(helia2);

    // this decoder will turn Uint8Arrays into strings
    const decoder = new TextDecoder();
    let text = "";

    // read the file from the blockstore using the second Helia node
    for await (const chunk of fs2.cat(cid)) {
      text += decoder.decode(chunk, {
        stream: true,
      });
    }
  }

  async create() {
    const { createHelia } = await import("helia");

    return createHelia();
  }

  async getData() {}
  async addData(string) {
    const { unixfs } = await import("@helia/unixfs");

    if (!this.helia) throw "helia not initialize";

    const fs = unixfs(this.helia);

    const encoder = new TextEncoder();
    const bytes = encoder.encode(string);
    try {
      const cid = await fs.addBytes(bytes);

      return cid.toString();
    } catch (error) {
      return error;
    }
  }

  async start() {
    try {
      this.helia = await this.create();
    } catch (error) {
      return error;
    }
  }
}

module.exports = {
  Ipfs,
};
