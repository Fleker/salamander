# 🦎 Salamander

Salamander is a type-safe wrapper for [Cloud Firestore](https://firebase.google.com/docs/firestore).
This means that gets, sets, and updates use [TypeScript generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
to give you a bit more assurance that you're performing the correct operation.

## Examples

### Get

```typescript
const _db = admin.firestore()
const db = salamander(_db)

const doc = await db.collection('users').doc(uid).get<User>()
// Type-inference means that `doc` will be properly typed
```

### Set

```typescript
const _db = admin.firestore()
const db = salamander(_db)

const doc = await db.collection('users').doc(uid).set<User>({
  // Validates fields are present
  firstName: 'Nick', // Validates types of fields
})
```

### Update

```typescript
const _db = admin.firestore()
const db = salamander(_db)

const doc = await db.collection('users').doc(uid).update<User>({
  // Validates no invalid fields present
  'settings.theme': 'DARK', // Validates types of fields
})
```

### Transactions

```typescript
const _db = admin.firestore()
const db = salamander(_db)

db.runTransaction(async t => {
  const ref = db.collection('users').doc(uid)
  // Currently transactions require `ref._raw` field, exposing
  // the underlying Firestore object. This will be fixed in
  // https://github.com/Fleker/salamander/issues/1
  const user = await t.get<User>(ref._raw)
  if (user.medals === undefined) {
    user.medals = 1
  } else {
    user.medals++
  }
  // Verifies types of transaction fields exist and are proper types
  transaction.update<User>(ref._raw, {medals: user.medals})
})
```

### Queries

```typescript
interface DemoInterface {
  required: boolean
  optional?: boolean
}

const users = db.collection('users')
const ref = users.doc('user1234')
const doc = await ref.get<DemoInterface>()
const data = doc.data()

const search = await users.where('field', '==', 'query').get<DemoInterface>()
const first = new SalamanderQuery<DemoInterface>(search.docs[0])
console.log(first.data().required)
```

## Build

```
yarn build
```