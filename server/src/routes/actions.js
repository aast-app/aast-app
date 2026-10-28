// Keep the existing public action URLs while using native Express handlers.
export function registerAction(router, name, action) {
  router.post(`/${name}`, async (req, res, next) => {
    req.operationStarted = true;
    try { res.json(await action(req.body ?? {}, req, res)); }
    catch (error) { next(error); }
    finally { await req.releaseWrite?.(); }
  });
}
