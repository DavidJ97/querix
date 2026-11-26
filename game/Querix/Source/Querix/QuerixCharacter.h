#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "QuerixCharacter.generated.h"
class USpringArmComponent;
class UCameraComponent;
UCLASS()
class QUERIX_API AQuerixCharacter : public ACharacter {
 GENERATED_BODY()
public:
 AQuerixCharacter();
 virtual void SetupPlayerInputComponent(UInputComponent* Input) override;
 UFUNCTION(BlueprintImplementableEvent, Category="Querix") void OnInteract();
protected:
 UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<USpringArmComponent> CameraBoom;
 UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TObjectPtr<UCameraComponent> FollowCamera;
 void Forward(float Value);
 void Right(float Value);
};