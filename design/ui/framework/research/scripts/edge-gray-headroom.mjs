// For each canvas, the gray closest to the canvas that still clears 3:1 against it and sits
// 15 (OKLab x100) from the Other gray #505050; prints its distance from the unstyled node gray.
// Run: node research/scripts/edge-gray-headroom.mjs
const lin=c=>{c/=255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4};
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const L=h=>{const [r,g,b]=hex(h).map(lin);return 0.2126*r+0.7152*g+0.0722*b};
const cr=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
const oklab=h=>{const [r,g,b]=hex(h).map(lin);const l=Math.cbrt(0.4122214708*r+0.5363325363*g+0.0514459929*b),m=Math.cbrt(0.2119034982*r+0.6806995451*g+0.1073969566*b),s=Math.cbrt(0.0883024619*r+0.2817188376*g+0.6299787005*b);return [0.2104542553*l+0.7936177850*m-0.0040720468*s,1.9779984951*l-2.4285922050*m+0.4505937099*s,0.0259040371*l+0.7827717662*m-0.8086757660*s]};
const d=(a,b)=>{const x=oklab(a),y=oklab(b);return 100*Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2])};
const g=v=>'#'+v.toString(16).padStart(2,'0').repeat(3).toUpperCase();
for(const canvas of ['#F5F5F5','#1E1E1E']){
  const ok=[];for(let v=0;v<256;v++){const h=g(v);if(cr(h,canvas)>=3&&d(h,'#505050')>=15)ok.push(h)}
  const near=canvas==='#F5F5F5'?ok[ok.length-1]:ok[0];
  console.log(canvas,'gray closest to canvas passing 3:1 and 15 from #505050:',near,cr(near,canvas).toFixed(2),'dist from #808080',d(near,'#808080').toFixed(1),'from #505050',d(near,'#505050').toFixed(1));
}
