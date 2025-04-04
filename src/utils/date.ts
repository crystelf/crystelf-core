let date = {
  getCurrentDate: () => {
    const now = new Date();
    return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
  },
  getCurrentTime: () => {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
  },
};

export default date;
