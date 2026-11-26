#include "QuerixCorridor.h"
#include "Components/StaticMeshComponent.h"
#include "Components/SceneComponent.h"
#include "UObject/ConstructorHelpers.h"
AQuerixCorridor::AQuerixCorridor(){
 SetRootComponent(CreateDefaultSubobject<USceneComponent>(TEXT("Root")));
 static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
 if(Cube.Succeeded()) BlockMesh=Cube.Object;
}
void AQuerixCorridor::Block(FVector Location,FVector Dimensions){
 if(!BlockMesh) return;
 auto* Part=NewObject<UStaticMeshComponent>(this);
 Part->CreationMethod=EComponentCreationMethod::UserConstructionScript;
 Part->SetupAttachment(GetRootComponent());
 Part->SetStaticMesh(BlockMesh);
 Part->SetRelativeLocation(Location);
 Part->SetRelativeScale3D(Dimensions/100.f);
 Part->SetCollisionProfileName(TEXT("BlockAll"));
 Part->RegisterComponent();
}
void AQuerixCorridor::OnConstruction(const FTransform& Transform){
 Super::OnConstruction(Transform);
 TArray<UStaticMeshComponent*> Parts;
 GetComponents<UStaticMeshComponent>(Parts);
 for(auto* Part:Parts) if(Part->CreationMethod==EComponentCreationMethod::UserConstructionScript) Part->DestroyComponent();
 Block(FVector(0,0,-10),FVector(1400,1000,20));
 Block(FVector(-690,0,150),FVector(20,1000,300));
 Block(FVector(690,0,150),FVector(20,1000,300));
 Block(FVector(0,-490,150),FVector(1400,20,300));
 Block(FVector(0,490,150),FVector(1400,20,300));
 // Two passages through a dividing wall at X=100.
 Block(FVector(100,-400,150),FVector(20,200,300));
 Block(FVector(100,0,150),FVector(20,320,300));
 Block(FVector(100,400,150),FVector(20,200,300));
}