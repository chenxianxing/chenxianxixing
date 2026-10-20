function md5FromBytes(bytes) {
  function add32(a, b){return (a+b)&0xFFFFFFFF;}
  function cmn(q,a,b,x,s,t){a=add32(add32(a,q),add32(x,t));return add32((a<<s)|(a>>>(32-s)),b);}
  function ff(a,b,c,d,x,s,t){return cmn((b&c)|(~b&d),a,b,x,s,t);}
  function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&~d),a,b,x,s,t);}
  function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t);}
  function ii(a,b,c,d,x,s,t){return cmn(c^(b|~d),a,b,x,s,t);}
  function cycle(x,k){
    var a=x[0],b=x[1],c=x[2],d=x[3];
    a=ff(a,b,c,d,k[0],7,-680876936);d=ff(d,a,b,c,k[1],12,-389564586);c=ff(c,d,a,b,k[2],17,606105819);b=ff(b,c,d,a,k[3],22,-1044525330);
    a=ff(a,b,c,d,k[4],7,-176418897);d=ff(d,a,b,c,k[5],12,1200080426);c=ff(c,d,a,b,k[6],17,-1473231341);b=ff(b,c,d,a,k[7],22,-45705983);
    a=ff(a,b,c,d,k[8],7,1770035416);d=ff(d,a,b,c,k[9],12,-1958414417);c=ff(c,d,a,b,k[10],17,-42063);b=ff(b,c,d,a,k[11],22,-1990404162);
    a=ff(a,b,c,d,k[12],7,1804603682);d=ff(d,a,b,c,k[13],12,-40341101);c=ff(c,d,a,b,k[14],17,-1502002290);b=ff(b,c,d,a,k[15],22,1236535329);
    a=gg(a,b,c,d,k[1],5,-165796510);d=gg(d,a,b,c,k[6],9,-1069501632);c=gg(c,d,a,b,k[11],14,643717713);b=gg(b,c,d,a,k[0],20,-373897302);
    a=gg(a,b,c,d,k[5],5,-701558691);d=gg(d,a,b,c,k[10],9,38016083);c=gg(c,d,a,b,k[15],14,-660478335);b=gg(b,c,d,a,k[4],20,-405537848);
    a=gg(a,b,c,d,k[9],5,568446438);d=gg(d,a,b,c,k[14],9,-1019803690);c=gg(c,d,a,b,k[3],14,-187363961);b=gg(b,c,d,a,k[8],20,1163531501);
    a=gg(a,b,c,d,k[13],5,-1444681467);d=gg(d,a,b,c,k[2],9,-51403784);c=gg(c,d,a,b,k[7],14,1735328473);b=gg(b,c,d,a,k[12],20,-1926607734);
    a=hh(a,b,c,d,k[5],4,-378558);d=hh(d,a,b,c,k[8],11,-2022574463);c=hh(c,d,a,b,k[11],16,1839030562);b=hh(b,c,d,a,k[14],23,-35309556);
    a=hh(a,b,c,d,k[1],4,-1530992060);d=hh(d,a,b,c,k[4],11,1272893353);c=hh(c,d,a,b,k[7],16,-155497632);b=hh(b,c,d,a,k[10],23,-1094730640);
    a=hh(a,b,c,d,k[13],4,681279174);d=hh(d,a,b,c,k[0],11,-358537222);c=hh(c,d,a,b,k[3],16,-722521979);b=hh(b,c,d,a,k[6],23,76029189);
    a=hh(a,b,c,d,k[9],4,-640364487);d=hh(d,a,b,c,k[12],11,-421815835);c=hh(c,d,a,b,k[15],16,530742520);b=hh(b,c,d,a,k[2],23,-995338651);
    a=ii(a,b,c,d,k[0],6,-198630844);d=ii(d,a,b,c,k[7],10,1126891415);c=ii(c,d,a,b,k[14],15,-1416354905);b=ii(b,c,d,a,k[5],21,-57434055);
    a=ii(a,b,c,d,k[12],6,1700485571);d=ii(d,a,b,c,k[3],10,-1894986606);c=ii(c,d,a,b,k[10],15,-1051523);b=ii(b,c,d,a,k[1],21,-2054922799);
    a=ii(a,b,c,d,k[8],6,1873313359);d=ii(d,a,b,c,k[15],10,-30611744);c=ii(c,d,a,b,k[6],15,-1560198380);b=ii(b,c,d,a,k[13],21,1309151649);
    a=ii(a,b,c,d,k[4],6,-145523070);d=ii(d,a,b,c,k[11],10,-1120210379);c=ii(c,d,a,b,k[2],15,718787259);b=ii(b,c,d,a,k[9],21,-343485551);
    x[0]=add32(a,x[0]);x[1]=add32(b,x[1]);x[2]=add32(c,x[2]);x[3]=add32(d,x[3]);
  }
  function bytesToWords(buf,off){var w=new Uint32Array(16);for(var j=0;j<16;j++){var p=off+j*4;w[j]=(buf[p]|(buf[p+1]<<8)|(buf[p+2]<<16)|(buf[p+3]<<24))>>>0;}return w;}
  function rhex(n){var h="0123456789abcdef".split("");var s="",j=0;for(;j<4;j+=1)s+=h[(n>>(j*8+4))&0x0F]+h[(n>>(j*8))&0x0F];return s;}
  var n=bytes.length,state=[1732584193,-271733879,-1732584194,271733878],i,j;
  for(i=0;i+64<=n;i+=64){cycle(state,bytesToWords(bytes,i));}
  var tail=new Uint8Array(64),rem=n-i;
  for(j=0;j<rem;j++)tail[j]=bytes[i+j];
  tail[rem]=0x80;
  if(rem>=56){cycle(state,bytesToWords(tail,0));tail=new Uint8Array(64);}
  var lb=n*8;tail[56]=lb&0xFF;tail[57]=(lb>>>8)&0xFF;tail[58]=(lb>>>16)&0xFF;tail[59]=(lb>>>24)&0xFF;
  var hi=Math.floor(lb/0x100000000);tail[60]=hi&0xFF;tail[61]=(hi>>>8)&0xFF;tail[62]=(hi>>>16)&0xFF;tail[63]=(hi>>>24)&0xFF;
  cycle(state,bytesToWords(tail,0));
  return rhex(state[0])+rhex(state[1])+rhex(state[2])+rhex(state[3]);
}
var enc=new TextEncoder();
var tests=[["", "d41d8cd98f00b204e9800998ecf8427e"],["a","0cc175b9c0f1b6a831c399e269772661"],["abc","900150983cd24fb0d6963f7d28e17f72"],["message digest","f96b697d7cb7938d525a2f31aaf161d0"],["The quick brown fox jumps over the lazy dog","9e107d9d372bb6826bd81d3542a419d6"],["中文测试","a86c4b941f4c47d2bd90db7e7b3e3e77"]];
var ok=true;
tests.forEach(function(t){var got=md5FromBytes(enc.encode(t[0]));var pass=got===t[1];if(!pass)ok=false;console.log((pass?"PASS":"FAIL"),JSON.stringify(t[0]),got,pass?"":("expected "+t[1]));});
console.log(ok?"ALL_MD5_OK":"MD5_FAIL");
