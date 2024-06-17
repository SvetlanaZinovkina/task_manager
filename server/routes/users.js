// @ts-check

import i18next from 'i18next';

export default (app) => {
  app
    .get('/users', { name: 'users' }, async (req, reply) => {
      const users = await app.objection.models.user.query();
      reply.render('users/index', { users });
      return reply;
    })
    .get('/users/new', { name: 'newUser' }, (req, reply) => {
      const user = new app.objection.models.user();
      reply.render('users/new', { user });
    })
    .get('/users/:id/edit', { name: 'currentUser' }, async (req, reply) => {
      const user = await app.objection.models.user.query().findById(req.params.id);

      if (!req.user) {
        req.flash('error', i18next.t('flash.authError'));
        reply.redirect(app.reverse('root'));
        return reply;
      }

      if (req.user.id !== Number(user.id)) {
        req.flash('error', i18next.t('flash.accessError'));
        reply.redirect(app.reverse('users'));
        return reply;
      }
      reply.render('/users/update', { user });
      return reply;
    })
    .post('/users', async (req, reply) => {
      const user = new app.objection.models.user();
      user.$set(req.body.data);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      try {

        if (!emailRegex.test(req.body.data.email)) {
          throw new Error('Invalid email format');
        }

        const validUser = await app.objection.models.user.fromJson(req.body.data);
        await app.objection.models.user.query().insert(validUser);
        req.flash('info', i18next.t('flash.users.create.success'));
        reply.redirect(app.reverse('root'));
      } catch ({ data }) {
        req.flash('error', i18next.t('flash.users.create.error'));
        reply.render('users/new', { user, errors: data });
      }

      return reply;
    })
    .patch('/users/:id', { name: 'updateUser', preValidation: app.authenticate }, async (req, reply) => {
      const { id } = req.params;

      try {
        await req.user.$query().update(req.body.data);
        req.flash('info', i18next.t('flash.users.update.success'));
        reply.redirect('/users');
      } catch ({ data }) {
        req.flash('error', i18next.t('flash.users.update.error'));
        reply.redirect((`/users/${id}/edit`), { errors: data });
      }
    })
  // eslint-disable-next-line consistent-return
    .delete('/users/:id', { name: 'deleteUser', preValidation: app.authenticate }, async (req, reply) => {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      try {
        const selectedUser = await app.objection.models.user.query().findById(id);
        const isCurrent = selectedUser.id === Number(currentUserId);

        if (!selectedUser) {
          req.flash('error', i18next.t('flash.users.delete.error'));
          return reply.redirect(app.reverse('users'));
        }

        const tasks = await app.objection.models.task.query()
          .where('creatorId', id)
          .orWhere('executorId', id)
          .first();

        if (tasks) {
          req.flash('error', i18next.t('flash.users.delete.error'));
          return reply.redirect(app.reverse('users'));
        }

        if (!isCurrent) {
          req.flash('error', i18next.t('flash.accessError'));
          return reply.redirect(app.reverse('users'));
        }

        await app.objection.models.user.query().deleteById(id);
        req.logOut();
        req.flash('info', i18next.t('flash.users.delete.success'));
        reply.redirect(app.reverse('users'));
      } catch (error) {
        req.flash('error', i18next.t('flash.users.delete.error'));
        reply.redirect(app.reverse('users'));
      }
    });
};
