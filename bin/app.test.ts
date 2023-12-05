import { createApp } from "./app"; 

// test case for app stack
// comment
const cidrError =
  "A VpcCidr must be provided for non-Sandbox environments (use the atat:VpcCidr context key) and it must be" +
  " a valid CIDR block";

describe("Validation tests", () => {
  const validCidr = "10.0.255.0/16";

describe("CIDR tests", () => {
  let context: Record<string, unknown> = {};

  beforeEach(() => {
    context = {
      "atat:EnvironmentId": "Dev",
      "atat:Sandbox": false,
      "atat:VpcFlowLogBucket": "arn:aws:us-east-1:s3::123456789012:flow-logs-123456789012-us-east-1",
    };
  });

    it("should throw if VpcCidr arbitrary string", async () => {
    context["atat:VpcCidr"] = "this is not a CIDR block";
    expect(() => {
      createApp({ context });
    }).toThrow(cidrError);
})

  it("should throw if VpcCidr has too few octets", async () => {
    context["atat:VpcCidr"] = "10.0.0/24";
    expect(() => {
      createApp({ context });
    }).toThrow(cidrError);
  });

  it("should throw if VpcCidr has too many octets", async () => {
    context["atat:VpcCidr"] = "10.1.2.3.4/24";
    expect(() => {
      createApp({ context });
    }).toThrow(cidrError);
  });

  it("should throw if VpcCidr octet out of range", async () => {
    context["atat:VpcCidr"] = "10.0.500.0/20";
    expect(() => {
      createApp({ context });
    }).toThrow(cidrError);
  });

  it("should throw if VpcCidr missing netmask", async () => {
    context["atat:VpcCidr"] = "10.0.0.0";
    expect(() => {
      createApp({ context });
    }).toThrow(cidrError);
  });

  it("should throw if VpcCidr netmask too small", async () => {
    context["atat:VpcCidr"] = "10.0.0.0/14";
    expect(() => {
      createApp({ context });
    }).toThrow(cidrError);
  });

  it("should throw if VpcCidr netmask too large", async () => {
    context["atat:VpcCidr"] = "10.0.0.0/30";
    expect(() => {
      createApp({ context });
    }).toThrow(cidrError);
  });
});
})
