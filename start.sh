while true; do
  echo "启动服务..."
  pnpm start
  echo "服务退出，5秒后重启..."
  sleep 5
done
