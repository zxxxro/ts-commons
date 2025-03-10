import type { AnnotationInterface } from '~/decorator/interfaces.ts';
import type { ComponentParametersType } from '~/container/types.ts';
import type { DecorationType, ArtifactType, DecoratorFunctionType } from '~/decorator/types.ts';

import AnnotationException from '~/decorator/exceptions/AnnotationException.ts';
import Common from '~/common/services/Common.ts';
import Consumer from '~/container/annotations/Consumer.ts';
import Decorator from '~/decorator/services/Decorator.ts';
import DecoratorKindEnum from '~/decorator/enums/DecoratorKindEnum.ts';
import Metadata from '~/common/services/Metadata.ts';
import Mixin from '~/common/annotations/Mixin.ts';
import Provider from '~/container/annotations/Provider.ts';
import Singleton from '~/common/annotations/Singleton.ts';
import Text from '~/common/services/Text.ts';

export class Component implements AnnotationInterface {
  onAttach<P>(artifact: ArtifactType, decoration: DecorationType<P & ComponentParametersType>): any {
    let target = artifact.target as any

    if (decoration.context.kind == DecoratorKindEnum.CLASS) {
      if (!Metadata.getProperty(target, Common.singleton)) {
        target = new Proxy(target, {
          construct(currentTarget, currentArgs, newTarget) {
            if (currentTarget.prototype !== newTarget.prototype) {
              return Reflect.construct(currentTarget, currentArgs, newTarget);
            }
            if (decoration?.parameters?.providers) {
              for (let index = 0; index < decoration.parameters.providers.length; index++) {
                const providerTarget = decoration.parameters.providers[index]
                const providerDecorator = {
                  target: providerTarget,
                  context: {
                    kind: DecoratorKindEnum.CLASS,
                    name: Text.toFirstLetterUppercase(providerTarget.name || providerTarget.constructor.name),
                    metadata: {},
                  }
                } as any

                Mixin([Provider(), Singleton()])(providerDecorator.target, providerDecorator.context);
              }
            }

            if (decoration?.parameters?.consumers) {
              for (let index = 0; index < decoration.parameters.consumers.length; index++) {
                const consumerTarget = decoration.parameters.consumers[index]
                const consumerDecorator = {
                  target: consumerTarget,
                  context: {
                    kind: DecoratorKindEnum.CLASS,
                    name: Text.toFirstLetterUppercase(consumerTarget.name || consumerTarget.constructor.name),
                    metadata: {},
                  }
                } as any

                Mixin([Consumer(), Provider()])(consumerDecorator.target, consumerDecorator.context);
              }
            }

            return Reflect.construct(currentTarget, currentArgs, newTarget);
          },
        });

        target.toString = Function.prototype.toString.bind(artifact.target)
      }

      return target
    }

    throw new AnnotationException('Method not implemented for {name} on {kind}.', {
      key: 'NOT_IMPLEMENTED',
      context: { name: artifact.name, kind: decoration.kind },
    });
  }
}

export default (parameters?: ComponentParametersType): DecoratorFunctionType => Decorator.apply(Component, parameters);
