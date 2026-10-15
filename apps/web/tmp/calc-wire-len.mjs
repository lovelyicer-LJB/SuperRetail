// 计算六条连线的精确路径长度（三次贝塞尔自适应采样 + 直线/圆弧段）
const bez = (p0,p1,p2,p3,steps=200) => {
  let len = 0, px = p0.x, py = p0.y
  for (let i=1;i<=steps;i++){
    const t=i/steps, u=1-t
    const x=u*u*u*p0.x+3*u*u*t*p1.x+3*u*t*t*p2.x+t*t*t*p3.x
    const y=u*u*u*p0.y+3*u*u*t*p1.y+3*u*t*t*p2.y+t*t*t*p3.y
    len+=Math.hypot(x-px,y-py); px=x; py=y
  }
  return len
}
const q = (a,c,b,steps=120) => {
  let len=0, px=a.x, py=a.y
  for (let i=1;i<=steps;i++){
    const t=i/steps, u=1-t
    const x=u*u*a.x+2*u*t*c.x+t*t*b.x
    const y=u*u*a.y+2*u*t*c.y+t*t*b.y
    len+=Math.hypot(x-px,y-py); px=x; py=y
  }
  return len
}
const L = (a,b)=>Math.hypot(b.x-a.x,b.y-a.y)
const paths = {
  supply: bez({x:244,y:252},{x:274,y:252},{x:282,y:252},{x:312,y:252}),
  recipe: bez({x:508,y:252},{x:536,y:252},{x:544,y:252},{x:572,y:252}),
  chef:   bez({x:410,y:424},{x:410,y:370},{x:670,y:352},{x:670,y:308}),
  sell:   bez({x:768,y:252},{x:796,y:252},{x:804,y:252},{x:832,y:252}),
  branch: bez({x:800,y:252},{x:800,y:330},{x:930,y:344},{x:930,y:424}),
  loop:   L({x:912,y:536},{x:912,y:556}) + q({x:912,y:556},{x:912,y:570},{x:898,y:570}) + L({x:898,y:570},{x:160,y:570}) + q({x:160,y:570},{x:146,y:570},{x:146,y:556}) + L({x:146,y:556},{x:146,y:308}),
}
for (const [k,v] of Object.entries(paths)) {
  const pct = (s)=> (s/v*100).toFixed(2)
  console.log(k, 'len='+v.toFixed(1),
    'core='+pct(30)+' '+ (100-30/v*100).toFixed(2),
    'tail='+pct(22)+' '+ (100-22/v*100).toFixed(2),
    'halo='+pct(44)+' '+ (100-44/v*100).toFixed(2))
}
