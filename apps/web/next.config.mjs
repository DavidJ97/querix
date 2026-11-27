const pages=process.env.QUERIX_PAGES==='1';
export default { ...(pages?{output:'export',basePath:'/querix',trailingSlash:true}:{}), images:{unoptimized:true}, env:{NEXT_PUBLIC_COMMIT:(process.env.GITHUB_SHA||'local').slice(0,7)} };
