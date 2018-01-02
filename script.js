var g=["","RUDDER","ELEVATOR"],h=["MIN","NEU","MAX"],k=[1,1],l=!1,m=new Date,n;
window.onload=function(){var f=m.getTime();document.addEventListener("touchstart",function(a){var e=m.getTime(),c=e-f,b=a.touches.length;f=e;!c||500<c||1<b||(a.preventDefault(),a.target.click())},!1);n=new WebSocket("ws://"+location.hostname+":81/",["arduino"]);n.onerror=function(a){document.getElementById("rud").innerHTML="DISCONNECTED";document.getElementById("ele").innerHTML="DISCONNECTED";console.log("WebSocket Error ",a)};n.onopen=function(){console.log("websocket opened");n.onclose=function(){alert("WebSocket Connection Closed. Retry Connection.")};
n.binaryType="arraybuffer";n.onmessage=function(a){function e(a,b){var c=new Uint8Array(8);c[0]=143;c[1]=248;c[2]=a[2];c[3]=240;c[4]=2;c[5]=a[5];c[6]=b&255;c[7]=p(c,7);n.send(c.buffer)}console.log("received message");console.log(a.data);a=new Uint8Array(a.data);for(var c=a.byteLength,b="Got",d=0;d<c;d++)b+=" "+a[d].toString(16);console.log(b);if(141===a[0]&&216===a[1]&&a[c-1]===p(a,c-1))if(0===a[3]){for(c=0;c<a[4];)b=c+5,1<=a[b]&&3>=a[b]||5<=a[b]&&7>=a[b]?(d=a[b+1]&255|(a[b+2]&255)<<8,d&32768&&(d=
-(65536-d)),document.getElementById("set"+a[b].toString()).innerHTML=d.toString(),console.log("set: set"+a[b].toString()+" to "+d.toString()),c+=3):8<=a[b]&&9>=a[b]?(document.getElementById("tsm"+(a[b]-7).toString()+a[b+1].toString()).style.backgroundColor="red",document.getElementById("tsm"+(a[b]-7).toString()+((a[b+1]+1)%2).toString()).style.backgroundColor="white",console.log("set: tsm"+(a[b]-7).toString()+" to "+a[b+1]),c+=2):10<=a[b]&&11>=a[b]?(d="tqm"+(a[b]-9).toString(),document.getElementById(d+
a[b+1].toString()).style.backgroundColor="red",document.getElementById(d+((a[b+1]+1)%3).toString()).style.backgroundColor="white",document.getElementById(d+((a[b+1]+2)%3).toString()).style.backgroundColor="white",console.log("set: "+d+" to "+a[b+1].toString()),c+=2):12<=a[b]&&13>=a[b]?(d="swp"+(a[b]-11).toString(),document.getElementById(d+(a[b+2]+1).toString()).style.backgroundColor=["white","red"][a[b+1]],document.getElementById(d+((a[b+2]+1)%2+1).toString()).style.backgroundColor="white",console.log("set: "+
d+" to "+(a[b+1]+1).toString()),c+=3):c+=a[4];l||(q(1),q(2),l=!0)}else if(1===a[3])if(1===a[5]){c=!0;b="Change [";d=((a[6]&4)>>2&255)+1;1>d||2<d?(b+="ERROR ",c=!1):b+=g[d]+" ";d=(a[6]&3).toString();"1"===d?b+="MIN]":"2"===d?b+="NEUTRAL]":"3"===d?b+="MAX]":(b+="ERROR]",c=!1);d=a[7]&255|(a[8]&255)<<8;d&32768&&(d=-(65536-d));var f=a[9]&255|(a[10]&255)<<8;f&32768&&(f=-(65536-f));b+=" "+d.toString()+" ==> "+f.toString();-1500<=f&&1500>=f||(c=!1);c&&confirm(b+"?")?e(a,1):(e(a,0),alert("CANCEL "+b))}else 3===
a[5]?(c=!0,b="Reboot [",1>a[6]||2<a[6]?(b+="ERROR",c=!1):b+=g[a[6]],b+="] servo",c&&confirm(b+"?")?e(a,1):(e(a,0),alert("CANCEL "+b))):4===a[5]?(c=!0,b="Set [",1>a[6]||2<a[6]?(b+="ERROR",c=!1):b+=g[a[6]],b+=" TORQUE[%]] "+a[7].toString()+"% ===> "+a[8].toString()+"%",0<=a[8]&&100>=a[8]||(c=!1),c&&confirm(b+"?")?e(a,1):(e(a,0),alert("CANCEL "+b))):5===a[5]?(c=!0,b="Set [",1>a[6]||2<a[6]?(b+="ERROR",c=!1):b+=g[a[6]],d=["OFF","ON","BREAK"],b+=" TORQUE MODE] ",3>a[7]?b+=d[a[7]]:(b+="ERROR",c=!1),b+=" ===> ",
3>a[8]?b+=d[a[8]]:(b+="ERROR",c=!1),c&&confirm(b+"?")?e(a,1):(e(a,0),alert("CANCEL "+b))):6===a[5]?(c=!0,b="Turn [",1>a[6]||2<a[6]?(b+="ERROR",c=!1):b+=g[a[6]],d=["OFF","ON"],b+=" TEST MODE] ",2>a[7]?b+=d[a[7]]:(b+="ERROR",c=!1),b+=" ===> ",2>a[8]?b+=d[a[8]]:(b+="ERROR",c=!1),c&&confirm(b+"?")?e(a,1):(e(a,0),alert("CANCEL "+b))):8===a[5]&&(c=!0,b="Execute [",1>a[6]||2<a[6]?(b+="ERROR",c=!1):b+=g[a[6]],b+="] ",d=["SLOW","FAST"],0<a[7]&&3>a[7]?b+=d[a[7]-1]:(b+="ERROR",c=!1),b+=" SWEEP",c&&confirm(b+
"?")?e(a,1):(e(a,0),alert("CANCEL "+b)))};setTimeout(function(){console.log("socket request");var a=new Uint8Array(7);a[0]=143;a[1]=248;a[2]=254;a[3]=2;a[4]=1;a[5]=1;a[6]=p(a,6);n.send(a.buffer)},1E3)}};
function q(f){var a=document.getElementById("try"+f.toString());a.value=parseInt(document.getElementById("set"+(1+4*(f-1)).toString()).innerHTML);document.getElementById("ind"+f.toString()+(1).toString()).style.backgroundColor="red";var e=[1,2,3];e.splice(0,1);for(var c=0;c<e.length;c++)document.getElementById("ind"+f.toString()+e[c].toString()).style.backgroundColor="white";k[f-1]=1;console.log("selected "+g[f]+" "+h[k[f-1]-1]);a.style.backgroundColor="#0ffff7";setTimeout(function(){a.style.backgroundColor=
"White"},100)}function p(f,a){for(var e=f[2],c=3;c<a;c++)e^=f[c];return e};