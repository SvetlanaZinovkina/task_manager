import i18next from 'i18next';

export default (app) => {
  app
    .get('/statuses', { name: 'statuses', preValidation: app.authenticate }, async (req, reply) => {
      const statuses = await app.objection.models.status.query();
      reply.render('statuses/index', { statuses });
      return reply;
    })
    .get('/statuses/new', { name: 'newStatuses', preValidation: app.authenticate }, (req, reply) => {
      const status = new app.objection.models.status();
      reply.render('statuses/new', { status });

      return reply;
    })
    .get('/statuses/:id/edit', { name: 'currentStatus' }, async (req, reply) => {
      const status = await app.objection.models.status.query().findById(req.params.id);

      reply.render('/statuses/update', { status });
      return reply;
    })
    .post('/statuses', async (req, reply) => {
      const status = new app.objection.models.status();
      status.$set(req.body.data);

      try {
        const validStatus = await app.objection.models.status.fromJson(req.body.data);
        await app.objection.models.status.query().insert(validStatus);
        req.flash('info', i18next.t('flash.statuses.create.success'));
        reply.redirect('/statuses');
      } catch ({ data }) {
        req.flash('error', i18next.t('flash.statuses.create.error'));
        reply.render('statuses/new', { status, errors: data.name });
      }

      return reply;
    })
    .patch('/statuses/:id', { name: 'updateStatus', preValidation: app.authenticate }, async (req, reply) => {
      const { id } = req.params;

      try {
        await req.status.$query().update(req.body.data);
        req.flash('info', i18next.t('flash.statuses.update.success'));
        reply.redirect('/statuses');
      } catch ({ data }) {
        req.flash('error', i18next.t('flash.users.updateStatus.error'));
        reply.redirect((`/statuses/${id}/edit`), { errors: data });
      }
    });
};
