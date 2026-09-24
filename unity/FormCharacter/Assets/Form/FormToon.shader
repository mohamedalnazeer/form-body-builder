Shader "FORM/Toon" {
 Properties { _BaseColor("Color",Color)=(1,1,1,1) _Unlit("Unlit",Float)=0 }
 SubShader { Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Opaque" }
 Pass { Cull Off
 HLSLPROGRAM
 #pragma vertex vert
 #pragma fragment frag
 #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
 struct Attributes { float4 positionOS:POSITION; float3 normalOS:NORMAL; };
 struct Varyings { float4 positionCS:SV_POSITION; float3 normalWS:TEXCOORD0; };
 CBUFFER_START(UnityPerMaterial)
 float4 _BaseColor; float _Unlit;
 CBUFFER_END
 Varyings vert(Attributes i){Varyings o;o.positionCS=TransformObjectToHClip(i.positionOS.xyz);o.normalWS=TransformObjectToWorldNormal(i.normalOS);return o;}
 half4 frag(Varyings i):SV_Target { float light=dot(normalize(i.normalWS),normalize(float3(-.55,.8,.7)));float band=light>.5?1.08:light>0?.89:light>-.45?.69:.5;return half4(_BaseColor.rgb*lerp(band,1,_Unlit),1); }
 ENDHLSL
 }
 }
}
