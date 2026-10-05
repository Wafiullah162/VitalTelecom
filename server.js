// VitalTelecom Accounting — zero-dependency Node.js server (Node 18+)
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,DIR=process.env.DATA_DIR||path.join(__dirname,'data');
const SIGNUP=process.env.ALLOW_SIGNUP!=='false';
fs.mkdirSync(DIR,{recursive:true});
const UF=path.join(DIR,'users.json'),SF=path.join(DIR,'sessions.json');
const rd=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch(e){return d}};
const wr=(f,d)=>{const t=f+'.tmp';fs.writeFileSync(t,JSON.stringify(d));fs.renameSync(t,f)};
let users=rd(UF,{}),sessions=rd(SF,{});const tries=new Map();
const hp=(pw,salt)=>crypto.scryptSync(pw,salt,64).toString('hex');
const send=(res,code,obj,h={})=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store',...h});res.end(JSON.stringify(obj))};
const body=req=>new Promise((ok,no)=>{let b='';req.on('data',c=>{b+=c;if(b.length>5e6){no();req.destroy()}});req.on('end',()=>{try{ok(JSON.parse(b||'{}'))}catch(e){ok({})}})});
const cookie=(req,res,token,age)=>`vt_sid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}`+(req.headers['x-forwarded-proto']==='https'?'; Secure':'');
function who(req){const m=(req.headers.cookie||'').match(/vt_sid=([a-f0-9]+)/);const s=m&&sessions[m[1]];if(!s||s.exp<Date.now())return null;return {token:m[1],...s}}
function start(req,res,u){const token=crypto.randomBytes(32).toString('hex');sessions[token]={uid:u.id,name:u.name,exp:Date.now()+30*864e5};wr(SF,sessions);return {'Set-Cookie':cookie(req,res,token,2592000)}}
const dfile=id=>path.join(DIR,'u_'+id+'.json');
http.createServer(async(req,res)=>{
  try{
    const url=req.url.split('?')[0],ip=req.headers['x-forwarded-for']?.split(',')[0]||req.socket.remoteAddress;
    if(!url.startsWith('/api/')){
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','X-Frame-Options':'DENY'});
      return res.end(fs.readFileSync(path.join(__dirname,'public','index.html')));
    }
    if(url==='/api/signup'&&req.method==='POST'){
      if(!SIGNUP)return send(res,403,{error:'closed'});
      const {u,p}=await body(req);
      if(typeof u!=='string'||typeof p!=='string'||u.trim().length<2||u.length>40||p.length<6)return send(res,400,{error:'short'});
      const key=u.trim().toLowerCase();if(users[key])return send(res,409,{error:'exists'});
      const salt=crypto.randomBytes(16).toString('hex');
      users[key]={id:crypto.randomBytes(8).toString('hex'),name:u.trim(),salt,hash:hp(p,salt)};wr(UF,users);
      return send(res,200,{ok:1},start(req,res,users[key]));
    }
    if(url==='/api/login'&&req.method==='POST'){
      const t=tries.get(ip)||{n:0,t:Date.now()};if(Date.now()-t.t>9e5){t.n=0;t.t=Date.now()}
      if(t.n>=10)return send(res,429,{error:'rate'});
      const {u,p}=await body(req);const x=users[String(u||'').trim().toLowerCase()];
      const ok=x&&typeof p==='string'&&crypto.timingSafeEqual(Buffer.from(hp(p,x.salt)),Buffer.from(x.hash));
      if(!ok){t.n++;tries.set(ip,t);return send(res,401,{error:'bad'})}
      tries.delete(ip);return send(res,200,{ok:1},start(req,res,x));
    }
    const s=who(req);
    if(url==='/api/logout'&&req.method==='POST'){if(s){delete sessions[s.token];wr(SF,sessions)}return send(res,200,{ok:1},{'Set-Cookie':cookie(req,res,'x',0)})}
    if(url==='/api/state'){
      if(!s)return send(res,401,{error:'auth'});
      if(req.method==='GET')return send(res,200,{username:s.name,state:rd(dfile(s.uid),null)});
      if(req.method==='PUT'){const {state}=await body(req);if(!state||typeof state!=='object')return send(res,400,{error:'bad'});wr(dfile(s.uid),state);return send(res,200,{ok:1})}
    }
    send(res,404,{error:'nf'});
  }catch(e){send(res,500,{error:'server'})}
}).listen(PORT,()=>console.log('VitalTelecom running on port '+PORT));
