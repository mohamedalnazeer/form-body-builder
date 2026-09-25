Shader "FORM/Toon" {
 Properties {
 _BaseColor("Color",Color)=(1,1,1,1)
 _Unlit("Unlit",Float)=0
 _OutlineColor("Outline Color",Color)=(.055,.06,.09,1)
 _OutlineWidth("Outline Width",Float)=.018
 }
 SubShader { Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Opaque" }
 Pass { Cull Off
 HLSLPROGRAM
 #pragma vertex vert
 #pragma fragment frag
 #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
 struct Attributes { float4 positionOS:POSITION; float3 normalOS:NORMAL; };
 struct Varyings { float4 positionCS:SV_POSITION; float3 normalWS:TEXCOORD0; float3 positionWS:TEXCOORD1; };
 CBUFFER_START(UnityPerMaterial)
 float4 _BaseColor; float _Unlit; float4 _OutlineColor; float _OutlineWidth;
 CBUFFER_END
 Varyings vert(Attributes i){Varyings o;o.positionCS=TransformObjectToHClip(i.positionOS.xyz);o.normalWS=TransformObjectToWorldNormal(i.normalOS);o.positionWS=TransformObjectToWorld(i.positionOS.xyz);return o;}
 half4 frag(Varyings i):SV_Target {
  float3 normal=normalize(i.normalWS);
  float light=dot(normal,normalize(float3(-.55,.8,.7)));
  float band=light>.56?1.08:light>.08?.9:light>-.38?.68:.48;
  float3 view=GetWorldSpaceNormalizeViewDir(i.positionWS);
  float rim=pow(saturate(1-dot(normal,view)),3.2)*.22;
  float3 base=_BaseColor.rgb*lerp(band,1,_Unlit);
  return half4(base+rim*_OutlineColor.rgb,1);
 }
 ENDHLSL
 }
 Pass {
  Cull Front
  ZWrite On
  HLSLPROGRAM
  #pragma vertex outlineVert
  #pragma fragment outlineFrag
  #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
  struct Attributes { float4 positionOS:POSITION; float3 normalOS:NORMAL; };
  struct Varyings { float4 positionCS:SV_POSITION; };
  CBUFFER_START(UnityPerMaterial)
  float4 _OutlineColor; float _OutlineWidth;
  CBUFFER_END
  Varyings outlineVert(Attributes i){Varyings o;o.positionCS=TransformObjectToHClip(i.positionOS.xyz+i.normalOS*_OutlineWidth);return o;}
  half4 outlineFrag(Varyings i):SV_Target{return _OutlineColor;}
 ENDHLSL
 }
 }
}
