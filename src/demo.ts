import { salamander, SalamanderQuery } from "."

/**
 * An interface that should only exist for the demo function.
 */
interface DemoInterface {
  required: boolean
  optional?: boolean
}

/**
 * We should never run this function, but should ensure it compiles.
 */
async function __demo() {
  const db = salamander()
  const users = db.collection('users')
  const ref = users.doc('fleker')
  const doc = await ref.get<DemoInterface>()
  const data = doc.data()
  console.log(data.required, data.optional)
  await ref.set<DemoInterface>({
    required: false,
  })
  await ref.update<DemoInterface>({})

  db.runTransaction(async t => {
    const tuser = await t.get<DemoInterface>(ref)
    const tdata = tuser.data()
    tdata.required = false

    t.update<DemoInterface>(ref, tdata)
  })

  const search = await users.where('field', '==', 'query').get<DemoInterface>()
  const first = new SalamanderQuery<DemoInterface>(search.docs[0])
  console.log(first.data().required)
}