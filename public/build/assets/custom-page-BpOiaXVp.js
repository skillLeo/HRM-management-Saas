import{R,j as o}from"./ui-DU6W5RP9.js";import{c as z,H as A}from"./app-p-MZc67U.js";import F from"./Header-DiI6DzDA.js";import T from"./Footer-Dx4-NcUh.js";import{u as $}from"./use-favicon-BbRV3I_M.js";import"./utils-BWxnHGCV.js";import"./menu-Ci9O-2mb.js";import"./mail-DqaK2u6w.js";import"./phone-BUv3BFC-.js";import"./map-pin-Bg8KiMiY.js";import"./instagram-Djlx16YY.js";import"./twitter-DETxKRyT.js";function X(){var u,f,h,x,g,b,y,j,_,v,C,N,k;const l=z(),{page:t,customPages:P=[],settings:e}=l.props,n=l.props.globalSettings;R.useEffect(()=>{const r=(n==null?void 0:n.is_demo)||!1;let c="left";if(r){const m=(H=>{var E;if(typeof document>"u")return null;const w=`; ${document.cookie}`.split(`; ${H}=`);if(w.length===2){const D=(E=w.pop())==null?void 0:E.split(";").shift();return D?decodeURIComponent(D):null}return null})("layoutPosition");(m==="left"||m==="right")&&(c=m)}else{const s=n==null?void 0:n.layoutDirection;(s==="left"||s==="right")&&(c=s)}const i=c==="right"?"rtl":"ltr";document.documentElement.dir=i,document.documentElement.setAttribute("dir",i),setTimeout(()=>{document.documentElement.getAttribute("dir")!==i&&(document.documentElement.dir=i,document.documentElement.setAttribute("dir",i))},1)},[]);const I=`
    .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
      color: #1f2937;
      font-weight: 600;
      margin-top: 2rem;
      margin-bottom: 1rem;
    }
    
    .prose h1 { font-size: 2.25rem; }
    .prose h2 { font-size: 1.875rem; }
    .prose h3 { font-size: 1.5rem; }
    
    .prose p {
      margin-bottom: 1.5rem;
      line-height: 1.75;
    }
    
    .prose ul, .prose ol {
      margin: 1.5rem 0;
      padding-left: 1.5rem;
    }
    
    .prose li {
      margin-bottom: 0.5rem;
    }
    
    .prose a {
      color: var(--primary-color);
      text-decoration: underline;
    }
    
    .prose blockquote {
      border-left: 4px solid var(--primary-color);
      padding-left: 1rem;
      margin: 1.5rem 0;
      font-style: italic;
      background-color: #f9fafb;
      padding: 1rem;
    }
    
    .prose img {
      max-width: 100%;
      height: auto;
      border-radius: 0.5rem;
      margin: 1.5rem 0;
    }
  `,a=((f=(u=e==null?void 0:e.config_sections)==null?void 0:u.theme)==null?void 0:f.primary_color)||"#3b82f6",d=((x=(h=e==null?void 0:e.config_sections)==null?void 0:h.theme)==null?void 0:x.secondary_color)||"#8b5cf6",p=((b=(g=e==null?void 0:e.config_sections)==null?void 0:g.theme)==null?void 0:b.accent_color)||"#10b77f";return $(),o.jsxs(o.Fragment,{children:[o.jsxs(A,{title:t.meta_title||t.title,children:[t.meta_description&&o.jsx("meta",{name:"description",content:t.meta_description}),o.jsx("style",{children:I})]}),o.jsxs("div",{className:"min-h-screen bg-white",style:{"--primary-color":a,"--secondary-color":d,"--accent-color":p,"--primary-color-rgb":((y=a.replace("#","").match(/.{2}/g))==null?void 0:y.map(r=>parseInt(r,16)).join(", "))||"59, 130, 246","--secondary-color-rgb":((j=d.replace("#","").match(/.{2}/g))==null?void 0:j.map(r=>parseInt(r,16)).join(", "))||"139, 92, 246","--accent-color-rgb":((_=p.replace("#","").match(/.{2}/g))==null?void 0:_.map(r=>parseInt(r,16)).join(", "))||"16, 185, 129"},children:[o.jsx(F,{"max-w-7xl":!0,"mx-auto":!0,p:!0,settings:e,customPages:P,sectionData:((C=(v=e==null?void 0:e.config_sections)==null?void 0:v.sections)==null?void 0:C.find(r=>r.key==="header"))||{},brandColor:a}),o.jsx("main",{className:"pt-16",children:o.jsx("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12",children:o.jsxs("div",{className:"max-w-4xl mx-auto",children:[o.jsxs("header",{className:"text-center mb-12",children:[o.jsx("h1",{className:"text-4xl font-bold text-gray-900 mb-4",children:t.title}),o.jsx("div",{className:"w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto rounded-full"})]}),o.jsx("article",{className:"prose prose-lg max-w-none",children:o.jsx("div",{className:"text-gray-700 leading-relaxed",dangerouslySetInnerHTML:{__html:t.content}})})]})})}),o.jsx(T,{settings:e,sectionData:((k=(N=e==null?void 0:e.config_sections)==null?void 0:N.sections)==null?void 0:k.find(r=>r.key==="footer"))||{},brandColor:a})]})]})}export{X as default};
