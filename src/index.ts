/**
 * @fileoverview Firestore APIs but they are now generic-typed for better type-safety
 * using interfaces instead of potentially more onerous than converters.
 * See https://github.com/googleapis/nodejs-firestore/issues/1231
 */

import * as admin from 'firebase-admin'

class Salamander {
  private db: FirebaseFirestore.Firestore

  constructor(firestore: FirebaseFirestore.Firestore) {
    this.db = firestore
  }

  get _raw() {
    return this.db
  }

  collection(collectionName: string) {
    return new SalamanderCollection(this.db.collection(collectionName))
  }

  async runTransaction(updateFunction: (transaction: SalamanderTxn) => Promise<any>) {
    return await this.db.runTransaction(async t => {
      return await updateFunction(new SalamanderTxn(t))
    })
  }
}

type ForEach<T> = (value: SalamanderQuery<T>, index: number, array: SalamanderQuery<T>[]) => void

class SalamanderCollection {
  private collection: FirebaseFirestore.CollectionReference
  private query: FirebaseFirestore.Query

  constructor(collection: FirebaseFirestore.CollectionReference) {
    this.collection = collection
    this.query = this.collection
  }

  async add<T extends admin.firestore.DocumentData>(data: T) {
    return this.collection.add(data)
  }

  limit(count: number) {
    this.query = this.query.limit(count)
    return this
  }

  startAfter(...fieldValues: any[]) {
    this.query = this.query.startAfter(...fieldValues)
    return this
  }

  orderBy(field: string, order?: 'desc' | 'asc') {
    this.query = this.query.orderBy(field, order || 'asc')
    return this
  }

  where(fieldPath: string | FirebaseFirestore.FieldPath, opStr: FirebaseFirestore.WhereFilterOp, value: any) {
    this.query = this.query.where(fieldPath, opStr, value)
    return this
  }

  async get<T>() {
    const snapshot = await this.query.get()
    const clone = {...snapshot,
      docs: [] as SalamanderQuery<T>[],
      forEach: (callback: ForEach<T>) => {}
    }
    clone.forEach = (callback: ForEach<T>) => {
      clone.docs.forEach(callback)
    }
    clone.docs = snapshot.docs.map(d => new SalamanderQuery<T>(d))
    return clone
  }

  doc(docName: string) {
    return new SalamanderRef(this.collection.doc(docName))
  }
}

export class SalamanderRef {
  private ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>

  constructor(ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>) {
    this.ref = ref
  }

  get id() {
    return this.ref.id
  }

  get _raw() {
    return this.ref
  }

  collection(subCollection: string) {
    return new SalamanderCollection(this.ref.collection(subCollection))
  }

  async create<T extends admin.firestore.DocumentData>(data: T): Promise<void> {
    await this.ref.create(data)
  }

  async get<T extends admin.firestore.DocumentData>(): Promise<SalamanderSnapshot<T>> {
    const doc = await this.ref.get()
    return new SalamanderSnapshot(doc)
  }

  async delete(): Promise<SalamanderRef> {
    await this.ref.delete()
    return this
  }

  async set<T extends admin.firestore.DocumentData>(data: T): Promise<unknown> {
    return await this.ref.set(data)
  }

  async update<T extends admin.firestore.DocumentData>(data: Partial<T>): Promise<unknown> {
    return await this.ref.update(data)
  }
}

export class SalamanderTxn {
  private txn: FirebaseFirestore.Transaction

  constructor(txn: FirebaseFirestore.Transaction) {
    this.txn = txn
  }

  get _raw() {
    return this.txn
  }

  async create<T extends admin.firestore.DocumentData>(data: T): Promise<SalamanderSnapshot<T>> {
    return this.create(data)
  }

  async delete(ref: SalamanderRef) {
    return this.txn.delete(ref._raw)
  }

  async get<T extends admin.firestore.DocumentData>(ref: SalamanderRef): Promise<SalamanderSnapshot<T>> {
    const doc = await this.txn.get(ref._raw)
    return new SalamanderSnapshot<T>(doc)
  }

  async getAll<T extends admin.firestore.DocumentData>(...documentRefsOrReadOptions: (FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData> | FirebaseFirestore.ReadOptions)[]) {
    const docs = await this.txn.getAll(...documentRefsOrReadOptions)
    return docs.map((doc: FirebaseFirestore.DocumentSnapshot<T>) => new SalamanderSnapshot<T>(doc))
  }

  async set<T extends admin.firestore.DocumentData>(ref: SalamanderRef, data: T): Promise<unknown> {
    return await this.txn.set(ref._raw, data)
  }

  async update<T extends admin.firestore.UpdateData<any>>(ref: SalamanderRef, data: Partial<T>): Promise<unknown> {
    return await this.txn.update(ref._raw, data)
  }
}

export class SalamanderQuery<T> {
  private snapshot: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>

  constructor(snapshot: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) {
    this.snapshot = snapshot
  }

  get createTime() {
    return this.snapshot.createTime
  }

  get exists() {
    return this.snapshot.exists
  }

  isEqual(comparable) {
    return this.snapshot.isEqual(comparable)
  }

  get(fieldPath: string) {
    return this.snapshot.get(fieldPath) as T
  }

  get id() {
    return this.snapshot.id
  }

  get readTime() {
    return this.snapshot.readTime
  }

  get ref() {
    return this.snapshot.ref
  }

  get _raw() {
    return this.snapshot
  }

  get updateTime() {
    return this.snapshot.updateTime
  }

  data() {
    return this.snapshot.data() as T
  }
}

export class SalamanderSnapshot<T> {
  private snapshot: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>

  constructor(snapshot: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
    this.snapshot = snapshot
  }

  get id() {
    return this.snapshot.id
  }

  get exists() {
    return this.snapshot.exists
  }

  get ref() {
    return new SalamanderRef(this.snapshot.ref)
  }

  data() {
    return this.snapshot.data() as T
  }
}

export function salamander(db?: FirebaseFirestore.Firestore) {
  return new Salamander(db || admin.firestore())
}
