export interface SessionState<User> { user?: User | null; loading?: boolean }

/** Firebase-independent lifecycle: deferred token reads must not restore an obsolete identity. */
export function createAuthSession<Sdk, Person extends { uid: string }, User>(options: {
  load: () => Promise<Sdk>;
  subscribe: (sdk: Sdk, receive: (person: Person | null) => void, failed: () => void) => () => void;
  current: (sdk: Sdk) => Person | null;
  resolve: (person: Person) => Promise<User>;
  signOut: (sdk: Sdk) => Promise<void>;
  changed: (state: SessionState<User>) => void;
}) {
  let alive = false, lifetime = 0, identity = 0, operation = 0;
  let pending = 0, blocked = false;
  let detach: (() => void) | null = null;
  let starting: Promise<void> | null = null;
  let mutations: Promise<unknown> = Promise.resolve();
  const current = (life: number) => alive && lifetime === life;
  const cancelled = () => Object.assign(new Error('Authentication operation superseded'), { code: 'auth/operation-cancelled' });
  function enqueue<T>(action: () => Promise<T>): Promise<T> {
    pending++;
    const task = mutations.then(action, action).finally(() => {
      pending--;
      if (!pending && alive && !blocked) {
        const life = lifetime;
        void options.load().then(sdk => receive(sdk, options.current(sdk), life)).catch(() => {});
      }
    });
    mutations = task.then(() => undefined, () => undefined);
    return task;
  }
  async function receive(sdk: Sdk, person: Person | null, life: number) {
    const revision = ++identity;
    if (!current(life) || pending || blocked) return;
    try {
      const user = person ? await options.resolve(person) : null;
      if (current(life) && revision === identity && !pending && !blocked
        && (options.current(sdk)?.uid || null) === (person?.uid || null)) options.changed({ user, loading: false });
    } catch {
      if (current(life) && revision === identity && !pending && !blocked) options.changed({ user: null, loading: false });
    }
  }
  function start(): Promise<void> {
    if (!alive) return Promise.resolve();
    if (starting) return starting;
    const life = lifetime;
    options.changed({ loading: true });
    const task = options.load().then(sdk => {
      if (!current(life)) return;
      detach = options.subscribe(sdk, person => { void receive(sdk, person, life); }, () => {
        if (current(life)) { identity++; options.changed({ user: null, loading: false }); }
      });
    }).catch(() => {
      if (current(life)) { starting = null; options.changed({ user: null, loading: false }); }
    });
    starting = task;
    return task;
  }
  return {
    mount() { alive = true; lifetime++; },
    unmount() { alive = false; lifetime++; operation++; identity++; detach?.(); detach = null; starting = null; },
    start,
    async authenticate(action: (sdk: Sdk) => Promise<Person>): Promise<User> {
      const life = lifetime, ticket = ++operation;
      blocked = false; identity++;
      if (!current(life)) throw cancelled();
      options.changed({ loading: true });
      void start();
      try {
        const { sdk, person } = await enqueue(async () => {
          const sdk = await options.load();
          if (!current(life) || ticket !== operation) throw cancelled();
          return { sdk, person: await action(sdk) };
        });
        if (!current(life) || ticket !== operation || blocked) throw cancelled();
        const user = await options.resolve(person);
        if (!current(life) || ticket !== operation || blocked || options.current(sdk)?.uid !== person.uid) throw cancelled();
        identity++;
        options.changed({ user, loading: false });
        return user;
      } catch (error) {
        if (current(life) && ticket === operation) options.changed({ loading: false });
        throw error;
      }
    },
    async logout(): Promise<void> {
      const life = lifetime, ticket = ++operation;
      blocked = true; identity++;
      if (current(life)) options.changed({ user: null, loading: true });
      try {
        // A pending sign-in completes before sign-out, so it cannot silently sign back in afterwards.
        await enqueue(async () => options.signOut(await options.load()));
      } finally {
        if (current(life) && ticket === operation) options.changed({ user: null, loading: false });
      }
    },
  };
}
