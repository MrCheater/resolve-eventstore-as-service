import * as fs from 'fs'
import * as path from 'path'
import { ensureFunction } from 'resolve-cloud-common/lambda'
import { ensureRoleWithPolicy } from 'resolve-cloud-common/iam'

void (async () => {
  const region = 'us-east-1'

  const eventStoreAsServiceRoleName = 'es-as-service-r'
  const eventStoreAsServicePolicyName = 'es-as-service-p'

  const applicationLambdaName = 'es-as-service-app'
  const applicationPath = path.join(__dirname, '..', '.assets', 'application.zip')

  const eventStoreAsServiceLambdaName = 'es-as-service-es'
  const eventStoreAsServicePath = path.join(__dirname, '..', '.assets', 'eventstore-as-service.zip')

  const eventBusAsServiceLambdaName = 'es-as-service-eb'
  const eventBusAsServicePath = path.join(__dirname, '..', '.assets', 'eventbus-as-service.zip')

  const eventStoreAsServiceRoleArn = await ensureRoleWithPolicy({
    Region: region,
    RoleName: eventStoreAsServiceRoleName,
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { Service: '*' },
          Action: 'sts:AssumeRole',
        },
      ],
    },
    PolicyName: eventStoreAsServicePolicyName,
    PolicyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: '*',
          Resource: '*',
        },
      ],
    },
  })

  await Promise.all(
    [
      [applicationLambdaName, applicationPath] as const,
      [eventStoreAsServiceLambdaName, eventStoreAsServicePath] as const,
      [eventBusAsServiceLambdaName, eventBusAsServicePath] as const,
    ].map(([lambdaName, assetPath]) =>
      ensureFunction({
        Region: region,
        RoleArn: eventStoreAsServiceRoleArn,
        ZipFile: fs.readFileSync(assetPath),
        FunctionName: lambdaName,
        Handler: 'lib/index.handler',
        Timeout: 15 * 60,
        MemorySize: 256,
        Runtime: 'nodejs14.x',
        Variables: {
          CONTEXT: JSON.stringify({
            applicationLambdaName,
            eventStoreAsServiceLambdaName,
            eventBusAsServiceLambdaName,
          }),
        },
      })
    )
  )
})()
