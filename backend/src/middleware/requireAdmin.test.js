describe("requireAdmin", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("rejects requests without the admin token", () => {
    process.env.ADMIN_TOKEN = "admin-secret";
    const requireAdmin = require("./requireAdmin");

    const next = jest.fn();
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    requireAdmin({ header: jest.fn().mockReturnValue("") }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows requests with the correct bearer token", () => {
    process.env.ADMIN_TOKEN = "admin-secret";
    const requireAdmin = require("./requireAdmin");

    const next = jest.fn();
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    requireAdmin({ header: jest.fn().mockReturnValue("Bearer admin-secret") }, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});