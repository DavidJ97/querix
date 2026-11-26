using UnrealBuildTool;
public class QuerixTarget : TargetRules {
 public QuerixTarget(TargetInfo Target) : base(Target) { Type = TargetType.Game; ExtraModuleNames.Add("Querix"); }
}