import Plugin from '../../core/types/plugin';
import MainService from './main.service';
import Core from './../../core/app/core';

const plugin: Plugin = {
  name: 'example',
  version: '1.0.0',
  dependencies: ['logger'],

  initialize() {
    this.service = new MainService();
    Core.registerService('example', this.service);
  },

  routes(app) {
    app.get('/api/example', (req, res) => {
      Core.response.success(res, { message: 'Hello from plugin' });
    });
  },

  onClose() {
    this.service.cleanup();
  },
};

export default plugin;
