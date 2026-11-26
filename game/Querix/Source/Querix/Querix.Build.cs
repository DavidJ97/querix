using UnrealBuildTool;
public class Querix : ModuleRules {
 public Querix(ReadOnlyTargetRules Target) : base(Target) {
 PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
 PublicDependencyModuleNames.AddRange(new string[]{"Core","CoreUObject","Engine","InputCore"});
 }
}