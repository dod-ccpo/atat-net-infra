import { ElasticLoadBalancingV2Client, RegisterTargetsCommand } from "@aws-sdk/client-elastic-load-balancing-v2"; 

const client = new ElasticLoadBalancingV2Client();

export const handler =  async (event: { detail: { ENIInformation: any; }; }) => {
  try {
  
    if (process.env.targetGroupArn == undefined) {
              throw new Error("targetgroup ARN is missing")
      }
    
    var targets = new Array();
    
    const eniInformation = event.detail.ENIInformation;
    eniInformation.forEach((eni: { Id: any; }) => {
      const id = eni.Id;
       targets.push(id);
    });
    
    console.log(targets[0])
      
    const input = {
      "TargetGroupArn": process.env.targetGroupArn,
      "Targets": [
          {
            "Id": targets[0],
            "AvailabilityZone": "all" 
          },
          {
            "Id": targets[1],
            "AvailabilityZone": "all"
          }
        ]
    };
    await client.send(new RegisterTargetsCommand(input));
    
    // return {
    //     statusCode: 200,
    //     body: JSON.stringify({ message: 'Event logged successfully' }),
    //   };
    console.log('Target group updated with IP addresses')
    } catch (error) {
      console.error('This is a Lambda Error:', error);
      throw error;
    }
  };