#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "QuerixArrow.generated.h"
class USphereComponent;
class UProjectileMovementComponent;
UCLASS()
class QUERIX_API AQuerixArrow : public AActor {
 GENERATED_BODY()
public:
 AQuerixArrow();
 UFUNCTION(BlueprintCallable, Category="Training") void Launch(FVector Direction,float Power);
protected:
 UPROPERTY(VisibleAnywhere) TObjectPtr<USphereComponent> Collision;
 UPROPERTY(VisibleAnywhere) TObjectPtr<UProjectileMovementComponent> Movement;
};