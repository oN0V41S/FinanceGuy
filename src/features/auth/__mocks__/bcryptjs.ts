const mockHash = jest.fn(() => Promise.resolve("hashed_new_password"));
const mockCompare = jest.fn(() => Promise.resolve(true));

const bcryptjsMock = { hash: mockHash, compare: mockCompare };

export default bcryptjsMock;
export { mockHash as hash, mockCompare as compare };
