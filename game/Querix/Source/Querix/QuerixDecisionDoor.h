#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "QuerixDecisionDoor.generated.h"
UCLASS(Blueprintable)
class QUERIX_API AQuerixDecisionDoor : public AActor {
 GENERATED_BODY()
public:
 UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Decision") FString NodeId;
 UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Decision") FString OptionId;
 UFUNCTION(BlueprintCallable, Category="Decision") void SelectAnswer() {
 if (!NodeId.IsEmpty() && !OptionId.IsEmpty()) OnAnswerRequested(NodeId,OptionId);
 }
 UFUNCTION(BlueprintImplementableEvent, Category="Decision") void OnAnswerRequested(const FString& QuestionId,const FString& AnswerId);
};