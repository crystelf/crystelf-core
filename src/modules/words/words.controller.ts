import express from 'express';
import WordsService from './words.service';
import response from '../../utils/core/response';

class WordsController {
  private readonly router: express.Router;

  constructor() {
    this.router = express.Router();
    this.init();
  }

  public getRouter(): express.Router {
    return this.router;
  }

  private init(): void {
    this.router.get('/getText/:id', this.getText);
  }

  private getText = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const id = req.params.id;
      const texts = await WordsService.loadWordById(id);
      if (!texts || texts.length === 0) {
        return await response.error(res, `文案${id}不存在或为空..`, 404);
      }
      const randomIndex = Math.floor(Math.random() * texts.length);
      const result = texts[randomIndex];
      await response.success(res, result);
    } catch (e) {
      await response.error(res);
    }
  };
}
export default new WordsController();
