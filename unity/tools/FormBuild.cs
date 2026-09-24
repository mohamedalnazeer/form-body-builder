using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
public static class FormBuild {
 const string PendingKey = "FORM.PendingWebBuild";
 static double readyAfter;
 static string Root => Path.GetFullPath(Path.Combine(Application.dataPath,"../../.."));
 [InitializeOnLoadMethod] static void ResumePendingBuild(){ if(SessionState.GetBool(PendingKey,false)) Schedule(); }
 static void Schedule(){ readyAfter=EditorApplication.timeSinceStartup+2; EditorApplication.update-=WaitForCompilation; EditorApplication.update+=WaitForCompilation; }
 static void WaitForCompilation(){
  if(EditorApplication.isCompiling || EditorApplication.isUpdating || BuildPipeline.isBuildingPlayer){readyAfter=EditorApplication.timeSinceStartup+2;return;}
  if(EditorApplication.timeSinceStartup<readyAfter)return;
  EditorApplication.update-=WaitForCompilation;SessionState.SetBool(PendingKey,false);BuildNow();
 }
 [MenuItem("FORM/Build character for web")]
 public static void Build(){
  if(BuildPipeline.isBuildingPlayer)return;
  Setup();File.WriteAllText(Path.Combine(Root,"unity/build-status.txt"),"Waiting for compilation");
  SessionState.SetBool(PendingKey,true);Schedule();
 }

 public static void Setup(){
  var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
  var go=new GameObject("FormCharacter");var character=go.AddComponent<FormCharacter>();character.toonShader=Shader.Find("FORM/Toon");
  var camera=new GameObject("Main Camera").AddComponent<Camera>();camera.tag="MainCamera";camera.transform.position=new Vector3(0,2.02f,7.1f);camera.transform.LookAt(new Vector3(0,2.02f,0));camera.fieldOfView=37;camera.clearFlags=CameraClearFlags.SolidColor;camera.backgroundColor=new Color(.055f,.065f,.057f,1);camera.nearClipPlane=.1f;camera.farClipPlane=30;
  EditorSceneManager.SaveScene(scene,"Assets/Scenes/FormCharacter.unity");EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene("Assets/Scenes/FormCharacter.unity",true)};
  PlayerSettings.companyName="FORM";PlayerSettings.productName="FORM Character";PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Disabled;PlayerSettings.WebGL.dataCaching=true;PlayerSettings.WebGL.initialMemorySize=64;PlayerSettings.WebGL.maximumMemorySize=512;PlayerSettings.runInBackground=false;PlayerSettings.colorSpace=ColorSpace.Linear;
  PlayerSettings.SetGraphicsAPIs(BuildTarget.WebGL,new[]{GraphicsDeviceType.OpenGLES3});PlayerSettings.SetManagedStrippingLevel(UnityEditor.Build.NamedBuildTarget.WebGL,ManagedStrippingLevel.Low);AssetDatabase.SaveAssets();
 }
 static void BuildNow(){
  string root=Path.GetFullPath(Path.Combine(Application.dataPath,"../../.."));string marker=Path.Combine(root,"unity/build-status.txt");
  try{File.WriteAllText(marker,"Building");var result=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{"Assets/Scenes/FormCharacter.unity"},locationPathName=Path.Combine(root,"public/unity"),target=BuildTarget.WebGL,options=BuildOptions.None});File.WriteAllText(marker,result.summary.result+" | errors: "+result.summary.totalErrors+" | bytes: "+result.summary.totalSize);}
  catch(Exception e){File.WriteAllText(marker,"Failed: "+e);Debug.LogException(e);}
 }
}
