# Project Requirements

# Project Structure

```bash
.
├── backend
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   └── app
│       ├── main.py
│       ├── routers # 路由
│       ├── models # Pydantic schema
│       ├── services
│       └── utils
├── docker-compose.yml
├── docs
│   ├── database_schema.md
│   ├── design
│   │   ├── assets  # logo，图标
│   │   │  
│   │   ├── prototypes # 高保真原型
│   │   └── wireframes # 线框图
│   │       
│   │       
│   │       
│   │       
│   └── requirements.md
└── frontend
    ├── Dockerfile
    ├── README.md
    ├── eslint.config.js
    ├── index.html
    ├── package-lock.json
    ├── package.json
    ├── public
    │   
    │   
    ├── src
    │   ├── App.css
    │   ├── App.jsx
    │   ├── assets
    │   │   
    │   │   
    │   │   
    │   ├── components # 复用组件
    │   ├── hooks # 自定义hooks
    │   ├── index.css
    │   ├── main.jsx
    │   ├── pages # 页面
    │   └── services #API请求层(axios封装)
    └── vite.config.js
```
