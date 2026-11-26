const pages=process.env.QUERIX_PAGES==='1';
export default { ...(pages?{output:'export',basePath:'/querix',trailingSlash:true}:{}), images:{unoptimized:true} };
