using System;
using System.Collections.Generic;
using UnityEngine;

[Serializable] public class FormNode { public string id,parent; public float[] position,rotation,scale; }
[Serializable] public class FormMesh { public string id,parent,color,group; public float[] vertices,normals,position,rotation; public int[] triangles; public bool unlit; }
[Serializable] public class FormRecipe { public FormNode[] nodes; public FormMesh[] meshes; }
public class FormCharacter : MonoBehaviour {
 public Shader toonShader;
 Dictionary<string,Transform> nodes=new Dictionary<string,Transform>();
 List<UnityEngine.Object> resources=new List<UnityEngine.Object>();
 float targetAngle=-7.45f, angle=-7.45f, started; string emote=""; bool reduced;
 Vector3 rootScale=Vector3.one;
 static Vector3 V(float[] a,Vector3 fallback){return a!=null&&a.Length==3?new Vector3(a[0],a[1],a[2]):fallback;}
 void Start(){
#if UNITY_WEBGL && !UNITY_EDITOR
  WebGLInput.captureAllKeyboardInput=false;
#endif
  Application.targetFrameRate=30; var asset=Resources.Load<TextAsset>("character");if(asset!=null)SetCharacter(asset.text);}
 public void SetCharacter(string json){
  var recipe=JsonUtility.FromJson<FormRecipe>(json);if(recipe==null||recipe.nodes==null||recipe.meshes==null)return;
  foreach(var o in resources)Destroy(o);resources.Clear();nodes.Clear();
  foreach(Transform child in transform)Destroy(child.gameObject);
  foreach(var n in recipe.nodes){var go=new GameObject(n.id);go.transform.SetParent(string.IsNullOrEmpty(n.parent)?transform:nodes[n.parent],false);go.transform.localPosition=V(n.position,Vector3.zero);go.transform.localEulerAngles=V(n.rotation,Vector3.zero)*Mathf.Rad2Deg;go.transform.localScale=V(n.scale,Vector3.one);nodes[n.id]=go.transform;}
  rootScale=nodes["root"].localScale;
  foreach(var m in recipe.meshes){var go=new GameObject(m.id);go.transform.SetParent(nodes[m.parent],false);go.transform.localPosition=V(m.position,Vector3.zero);go.transform.localEulerAngles=V(m.rotation,Vector3.zero)*Mathf.Rad2Deg;
   var mesh=new Mesh();mesh.name=m.id;var vertices=new Vector3[m.vertices.Length/3];var normals=new Vector3[vertices.Length];for(int i=0;i<vertices.Length;i++){vertices[i]=new Vector3(m.vertices[i*3],m.vertices[i*3+1],m.vertices[i*3+2]);normals[i]=new Vector3(m.normals[i*3],m.normals[i*3+1],m.normals[i*3+2]);}mesh.vertices=vertices;mesh.triangles=m.triangles;mesh.normals=normals;mesh.RecalculateBounds();go.AddComponent<MeshFilter>().sharedMesh=mesh;resources.Add(mesh);
   var mat=new Material(toonShader);Color c;if(!ColorUtility.TryParseHtmlString(m.color,out c))c=Color.white;mat.SetColor("_BaseColor",c);mat.SetFloat("_Unlit",m.unlit?1:0);go.AddComponent<MeshRenderer>().sharedMaterial=mat;resources.Add(mat);
  }
 }
 public void SetView(string view){targetAngle=view=="back"?180:view=="side"?90:-7.45f;}
 public void SetOrbit(string value){float delta;if(float.TryParse(value,System.Globalization.NumberStyles.Float,System.Globalization.CultureInfo.InvariantCulture,out delta))targetAngle+=delta;}
 public void SetReducedMotion(string value){reduced=value=="true";}
 public void PlayEmote(string kind){emote=kind;started=Time.time;}
 static float S(float n){n=Mathf.Clamp01(n);return n*n*(3-2*n);}
 void Rotation(string id,Vector3 radians){if(nodes.ContainsKey(id))nodes[id].localEulerAngles=radians*Mathf.Rad2Deg;}
 void Update(){if(!nodes.ContainsKey("root"))return;
  angle=reduced?targetAngle:Mathf.LerpAngle(angle,targetAngle,1-Mathf.Exp(-Time.deltaTime*6));nodes["root"].localEulerAngles=new Vector3(0,angle,0);
  float t=Time.time-started,breath=reduced?0:Mathf.Sin(Time.time*1.6f)*.006f,head=reduced?0:Mathf.Sin(Time.time*.7f)*.018f;Vector3 left=new Vector3(0,0,-.14f),right=new Vector3(0,0,.14f),fl=new Vector3(-.06f,0,0),fr=fl;bool food=false;float foodScale=1,rootY=0;
  if(t>4.2f)emote="";
  if(!reduced&&emote=="meal"){float lift=S(t/.65f)*(1-S((t-2.45f)/.65f));right=new Vector3(-.38f*lift,0,.14f-1.13f*lift);fr=new Vector3(.12f*lift,0,-1.92f*lift);head=.09f*lift+Mathf.Sin(t*15)*.022f*lift;food=t<2.5f;foodScale=t>1.4f?.65f:1;if(t>2.65f&&t<3.1f)breath+=Mathf.Sin((t-2.65f)/.45f*Mathf.PI)*.028f;}
  if(!reduced&&emote=="workout"){float power=S((t-.15f)/.65f)*(1-S((t-2.6f)/.75f));right=new Vector3(-.06f,0,.14f+1.22f*power);left=new Vector3(-.06f,0,-.14f-1.22f*power);fr=new Vector3(0,0,1.51f*power);fl=new Vector3(0,0,-1.51f*power);rootY=-.035f*power;head=-.055f*power;}
  nodes["root"].localPosition=new Vector3(0,rootY,0);nodes["torso"].localPosition=new Vector3(0,1.87f+breath,0);Rotation("head",new Vector3(head,0,0));Rotation("arm-left",left);Rotation("arm-right",right);Rotation("forearm-left",fl);Rotation("forearm-right",fr);
  if(nodes.ContainsKey("food")){nodes["food"].gameObject.SetActive(food);nodes["food"].localScale=Vector3.one*foodScale;}
 }
 void OnDestroy(){foreach(var o in resources)Destroy(o);}
}
