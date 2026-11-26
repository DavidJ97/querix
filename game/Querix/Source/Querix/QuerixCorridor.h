#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "QuerixCorridor.generated.h"
class UStaticMesh;
UCLASS()
class QUERIX_API AQuerixCorridor : public AActor {
 GENERATED_BODY()
public:
 AQuerixCorridor();
 virtual void OnConstruction(const FTransform& Transform) override;
protected:
 UPROPERTY(EditAnywhere, Category="Corridor") TObjectPtr<UStaticMesh> BlockMesh;
 void Block(FVector Location,FVector Dimensions);
};