# English Mastery Pro V2.0 - Step 2 AI Search

这个版本支持：
- 输入任意主题
- 选择 A1-C2 难度
- 前端调用 `/api/generate-reading`
- 后端使用 Tavily 搜索网络资料
- 后端使用 OpenAI 生成阅读文章、词汇、题目、解析和来源

## 文件结构

```
index.html
manifest.webmanifest
service-worker.js
icons/
api/generate-reading.js
package.json
vercel.json
.env.example
```

## 部署到 Vercel

### 1. 上传到 GitHub
把本文件夹全部内容上传到你的 GitHub 仓库根目录。

### 2. 登录 Vercel
使用 GitHub 账号登录 Vercel。

### 3. Import Project
选择你的 `english-reading-coach` 仓库。

### 4. 配置 Environment Variables
在 Vercel 项目设置中添加：

```
OPENAI_API_KEY=你的 OpenAI API Key
OPENAI_MODEL=gpt-4.1-mini
TAVILY_API_KEY=你的 Tavily API Key
```

### 5. Deploy
部署完成后，打开 Vercel 提供的网址即可测试。

## 重要说明

GitHub Pages 只能托管静态页面，不能运行 `/api/generate-reading` 后端函数。
如果继续使用 GitHub Pages，需要把前端请求地址改为你的 Vercel API 地址，例如：

```js
fetch("https://your-vercel-app.vercel.app/api/generate-reading", ...)
```

更简单的做法是：整个项目直接部署到 Vercel。
