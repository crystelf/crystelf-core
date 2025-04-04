import path from 'path';

const paths = {
  get: (value?: string) => {
    switch (value) {
      case 'root':
        return path.join(__dirname, '..');
      case 'public':
        return path.join(__dirname, '../public');
      case 'images':
        return path.join(__dirname, '../../public/images/');
      case 'log':
        return path.join(__dirname, '../../logs');
      default:
        return path.join(__dirname, '..');
    }
  },

  resolve: (segments: string) => {
    return path.join(__dirname, segments);
  },
};

export default paths;
