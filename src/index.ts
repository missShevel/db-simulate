import assert from "assert";
import fs from "fs-extra";
import { v4 } from "uuid";

type WithId = { id: string };

class Database {
  filename: string;

  // remembers filepath, ensures it exists, if not - it is created with empty object
  async setup(filename: string) {
    this.filename = filename;
    await fs.ensureFile(filename);
    const fileContent = await fs.readFile(filename);
    if (fileContent.length === 0) await this.saveDatabase({});
  }

  // creates new entity ({ users: [] }) for example, if already exists, should log 'Entity already exists, skipping....' and return
  public async createEntity(entity: string) {
    const existingData = await this.getDatabase();
    if (existingData.hasOwnProperty(entity)) {
      throw new Error("Entity already exists");
    }
    const updatedData = { ...existingData, [entity]: [] };
    await this.saveDatabase(updatedData);
  }

  // get all entities (public)
  async getAll<T>(entity: string): Promise<T[]> {
    return await this.getEntities(entity);
  }

  // get entity by Id
  async getOne<T extends WithId>(
    entity: string,
    id: string
  ): Promise<T | null> {
    const items = await this.getAll(entity);
    return items.find((item: T) => item.id === id) as T;
  }

  // clear all database
  async clearDb() {
    await this.saveDatabase({});
  }

  // adds new entity to list of entities. Generates id using uuid.v4
  async addOne<T>(entity: string, obj: Omit<T, "id">): Promise<T> {
    const entityData = await this.getEntities(entity);
    const newItem = {
      ...obj,
      id: v4(),
    };
    await this.saveEntities(entity, [...entityData, newItem]);
    return newItem as T;
  }

  // deletes entity by id. If not found, it is okay, no error occurs.
  async removeOne(entity: string, id: string): Promise<void> {
    if (await this.getOne(entity, id)) {
      const entityData = await this.getEntities(entity);
      const updatedEntityData = entityData.filter(
        (item: WithId) => item.id != id
      );
      await this.saveEntities(entity, [...updatedEntityData]);
    }
  }

  // ==PRIVATE METHODS==
  // get all database
  private async getDatabase() {
    return await fs.readJSON(this.filename);
  }

  // // get all entities in database
  private async getEntities<T>(entity: string): Promise<T[]> {
    const allData = await this.getDatabase();
    return allData[entity];
  }

  // updates entity in database
  private async saveEntities<T>(entity: string, data: T[]) {
    const allData = await this.getDatabase();
    allData[entity] = data;
    await this.saveDatabase(allData);
  }

  // save(rewrite) all database
  private async saveDatabase(db: Record<string, any[]>) {
    await fs.writeJson(this.filename, db);
  }
}

interface IUser {
  id: string;
  name: string;
}

(async () => {
  const db = new Database();
  await db.setup("./storage/db.json"); // ensure db
  await db.clearDb(); // clear db

  await db.createEntity("users"); // create table users

  await db.addOne<IUser>("users", { name: "John" }); // insert John
  await db.addOne<IUser>("users", { name: "Maria" }); // insert Maria
  await db.addOne<IUser>("users", { name: "Peter" }); // insert Maria
  await db.addOne<IUser>("users", { name: "Jack" }); // insert Maria

  const allUsers = await db.getAll<IUser>("users"); // returns array of 2 object
  assert.equal(allUsers.length, 4); // automatically checks if this is correct

  const idOfSecondUser = allUsers[1].id; // generated id of second user
  const oneUser = await db.getOne<IUser>("users", idOfSecondUser); // user
  assert.equal(oneUser.id, idOfSecondUser); // checks getOne method

  console.log("All users:", allUsers);
  console.log("User by id:", oneUser);
  await db.removeOne("users", idOfSecondUser);

  const removed = await db.getOne<IUser>("users", idOfSecondUser);
  assert.equal(removed, null); // checks removeOne method

  console.log(removed);
})();
