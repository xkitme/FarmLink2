# GitHub Issues Export

- Repository: [xkitme/FarmLink](https://github.com/xkitme/FarmLink)
- Exported at: 2026-05-27T06:35:48.0210947Z
- Issue count: 3

## #3 询问ai时，输入框不会自动聚焦

- State: OPEN
- URL: https://github.com/xkitme/FarmLink/issues/3
- Author: xkitme
- Created: 2026-05-27T01:59:08Z
- Updated: 2026-05-27T01:59:08Z

### Body

询问ai时，输入框不会自动聚焦

### Comments

_No comments._

## #2 readme文件缺少手动启动命令

- State: OPEN
- URL: https://github.com/xkitme/FarmLink/issues/2
- Author: yzk225
- Created: 2026-05-27T01:38:30Z
- Updated: 2026-05-27T01:38:30Z

### Body

readme文件只有一键启动包

### Comments

_No comments._

## #1 启动后端时，命令行出现乱码

- State: OPEN
- URL: https://github.com/xkitme/FarmLink/issues/1
- Author: yzk225
- Created: 2026-05-27T01:37:39Z
- Updated: 2026-05-27T01:52:01Z
- Attachments:
  - [attachments/issue-1-attachment-1.png](attachments/issue-1-attachment-1.png) from https://github.com/user-attachments/assets/81d16874-6db8-483a-bb7e-42373d979139

### Body

如图所示

<img width="979" height="512" alt="Image" src="https://github.com/user-attachments/assets/81d16874-6db8-483a-bb7e-42373d979139" />

### Comments

#### yzk225 at 2026-05-27T01:39:37Z

D:\FarmLink\backend>npm run dev

> farmlink-backend@1.0.0 dev
> concurrently -n backend,admin -c bgBlue,bgGreen "nodemon src/server.js" "npm run dev --prefix admin"

[backend] [nodemon] 3.1.14
[backend] [nodemon] to restart at any time, enter `rs`
[backend] [nodemon] watching path(s): *.*
[backend] [nodemon] watching extensions: js,mjs,cjs,json
[backend] [nodemon] starting `node src/server.js`
[admin]
[admin] > farmlink-admin@1.0.0 dev
[admin] > vite --host 0.0.0.0
[admin]
[admin] 'vite' �����ڲ����ⲿ���Ҳ���ǿ����еĳ���
[admin] ���������ļ���
[admin] npm run dev --prefix admin exited with code 1
[backend] D:\FarmLink\backend\node_modules\.prisma\client\default.js:43
[backend]     throw new Error('@prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.');
[backend]           ^
[backend]
[backend] Error: @prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.
[backend]     at new PrismaClient (D:\FarmLink\backend\node_modules\.prisma\client\default.js:43:11)
[backend]     at file:///D:/FarmLink/backend/src/db.js:4:23
[backend]     at ModuleJob.run (node:internal/modules/esm/module_job:439:25)
[backend]     at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
[backend]     at async node:internal/modules/esm/loader:633:26
[backend]     at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5)
[backend]
[backend] Node.js v24.16.0
[backend] [nodemon] app crashed - waiting for file changes before starting...
终止批处理操作吗(Y/N)? [backend] ^C
[backend] nodemon src/server.js exited with code 3221225786

#### yzk225 at 2026-05-27T01:51:40Z

D:\FarmLink\backend>npm run db:migrate

> farmlink-backend@1.0.0 db:migrate
> prisma migrate dev

Prisma schema loaded from prisma\schema.prisma
Datasource "db": SQLite database

Error: Prisma schema validation - (get-config wasm)
Error code: P1012
error: Environment variable not found: DATABASE_URL.
  -->  prisma\schema.prisma:16
   |
15 |   provider = "sqlite"
16 |   url      = env("DATABASE_URL")
   |

Validation Error Count: 1
[Context: getConfig]

Prisma CLI Version : 5.22.0

#### yzk225 at 2026-05-27T01:52:01Z

D:\FarmLink\backend>npm run db:seed

> farmlink-backend@1.0.0 db:seed
> node seeds/index.js

D:\FarmLink\backend\node_modules\.prisma\client\default.js:43
    throw new Error('@prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.');
          ^

Error: @prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.
    at new PrismaClient (D:\FarmLink\backend\node_modules\.prisma\client\default.js:43:11)
    at file:///D:/FarmLink/backend/seeds/index.js:8:16
    at ModuleJob.run (node:internal/modules/esm/module_job:439:25)
    at async node:internal/modules/esm/loader:633:26
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5)

Node.js v24.16.0

D:\FarmLink\backend>



