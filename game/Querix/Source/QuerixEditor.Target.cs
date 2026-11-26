using UnrealBuildTool;
public class QuerixEditorTarget : TargetRules {
 public QuerixEditorTarget(TargetInfo Target) : base(Target) { Type = TargetType.Editor; ExtraModuleNames.Add("Querix"); }
}